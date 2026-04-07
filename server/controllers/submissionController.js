const mongoose = require('mongoose');
const axios = require('axios');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Contest = require('../models/Contest');
const { addJobToQueue, judgePool } = require('../services/judgeClient');
const { computeLeaderboard } = require('./leaderboardController');

const LEADERBOARD_URL = process.env.LEADERBOARD_URL || 'http://localhost:5001';

// ── Constants ────────────────────────────────────────────────────────
const MAX_CODE_BYTES = 65536; // 64 KB hard limit
const MAX_LOG_CHARS = 2048;  // BSON overflow prevention

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Safely decode a Base64-encoded source-code payload into UTF-8.
 * Throws TypeError on malformed input.
 */
function decodeBase64Code(b64String) {
  const buf = Buffer.from(b64String, 'base64');
  return buf.toString('utf-8');
}

/**
 * Truncate a string to `maxLen` characters, appending an ellipsis marker
 * if truncation occurred.
 */
function truncate(str, maxLen = MAX_LOG_CHARS) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, maxLen - 20) + '\n... [truncated]';
}

/**
 * Parse timeLimit from DB (may be string like "2s" or number in ms).
 * Always returns milliseconds.
 */
function parseTimeLimit(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const match = raw.match(/([\d.]+)\s*(s|ms)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || 's').toLowerCase();
      return unit === 'ms' ? val : val * 1000;
    }
  }
  return 2000; // default 2s
}

/**
 * Parse memoryLimit from DB (may be string like "256 MB" or number in KB).
 * Always returns kilobytes.
 */
function parseMemoryLimit(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const match = raw.match(/([\d.]+)\s*(KB|MB|GB)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || 'MB').toUpperCase();
      if (unit === 'GB') return val * 1024 * 1024;
      if (unit === 'MB') return val * 1024;
      return val; // KB
    }
  }
  return 256000; // default 256 MB
}

// ── Controllers ──────────────────────────────────────────────────────

exports.getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('problem', 'title difficulty')
      .select('-code');
    if (!submission) return res.status(404).json({ success: false, error: 'Submission not found.' });
    if (submission.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this submission.' });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSubmission = async (req, res) => {
  const { problemId, code, language, contestId } = req.body;
  const userId = req.user.id; // authMiddleware sets req.user = decoded (full payload)

  try {
    // ── 0. Basic field validation ────────────────────────────────────
    if (!problemId || !code || !language) {
      return res.status(400).json({
        success: false,
        error: 'problemId, code, and language are required.'
      });
    }

    // ── 1. Base64 Deserialization (with exploit mitigation) ──────────
    let decodedCode;
    try {
      decodedCode = decodeBase64Code(code);
    } catch (decodeError) {
      return res.status(400).json({
        success: false,
        error: 'Malformed Base64 payload. Could not decode source code.'
      });
    }

    // ── 2. 64KB Hard Limit (Database DoS mitigation) ────────────────
    if (Buffer.byteLength(decodedCode, 'utf-8') > MAX_CODE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Source code exceeds the ${MAX_CODE_BYTES}-byte limit (${Buffer.byteLength(decodedCode, 'utf-8')} bytes).`
      });
    }

    // ── 3. Problem existence & constraint fetch ─────────────────────
    // Resolve numeric problemId (e.g. "12") to ObjectId via problemNumber
    let resolvedProblemId = problemId;
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      const num = parseInt(String(problemId), 10);
      if (!isNaN(num)) {
        const p = await Problem.findOne({ problemId: num });
        if (p) resolvedProblemId = p._id;
      }
    }
    const problem = await Problem.findById(resolvedProblemId);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found.' });
    }
    const problemIdForSubmission = problem._id;

    // ── 4. Contest temporal boundary validation ──────────────────────
    let resolvedContest = null;
    const now = new Date();

    if (contestId) {
      // Explicit contestId: strict temporal check
      resolvedContest = await Contest.findById(contestId);
      if (!resolvedContest) {
        return res.status(404).json({ success: false, error: 'Contest not found.' });
      }
      if (now < resolvedContest.startTime || now > resolvedContest.endTime) {
        return res.status(400).json({
          success: false,
          error: 'Contest is not currently active. Submissions are only accepted during the contest window.'
        });
      }
      // Verify the problem belongs to this contest
      const problemInContest = resolvedContest.problems.some(
        (pid) => pid.toString() === problemIdForSubmission.toString()
      );
      if (!problemInContest) {
        return res.status(400).json({
          success: false,
          error: 'This problem does not belong to the specified contest.'
        });
      }
    } else {
      // No explicit contestId: auto-detect active contest for this problem, or allow practice mode
      resolvedContest = await Contest.findOne({
        problems: problemIdForSubmission,
        startTime: { $lte: now },
        endTime: { $gte: now },
      });
      // If no active contest, allow practice submission (contest: null)
    }

    const timeLimit = parseTimeLimit(problem.timeLimit);        // ms
    const memoryLimit = parseMemoryLimit(problem.memoryLimit);   // KB

    // ── 5. Synchronous Database Commit (State: PEND) ────────────────
    const submission = new Submission({
      user: userId,
      problem: problemIdForSubmission,
      contest: resolvedContest ? resolvedContest._id : null,
      code: decodedCode,
      language
    });

    try {
      await submission.save();
    } catch (saveError) {
      console.error('Submission save error:', saveError);
      if (saveError.errors) console.error('Validation errors:', saveError.errors);
      if (saveError.code) console.error('MongoDB error code:', saveError.code);
      return res.status(500).json({
        success: false,
        error: `Failed to save submission: ${saveError.message}`
      });
    }

    // ── 6. Release HTTP Request (202 Protocol) ──────────────────────
    res.status(202).json({
      success: true,
      submissionId: submission._id,
      status: submission.status,
      message: 'Submission enqueued successfully.'
    });

    // ── 7. Asynchronous Execution Pipeline (Fire-and-Forget) ────────
    addJobToQueue({
      submissionId: submission._id,
      code: decodedCode,
      language,
      timeLimit,
      memoryLimit,
      testCases: problem.testCases || [],
      executionMode: problem.executionMode || 'RAW',
    })
      .then(async (result) => {
        // Update Database with Terminal State (truncate logs)
        await Submission.findByIdAndUpdate(submission._id, {
          $set: {
            status: result.status,
            'metrics.time': result.executionTime,
            'metrics.memory': result.memoryUsed,
            failedTestCase: result.failedTestCase || null,
            'logs.stdout': truncate(result.logs?.stdout),
            'logs.stderr': truncate(result.logs?.stderr)
          }
        });

        // Leaderboard Broadcast (Only on Accepted, and only if contest exists)
        if (result.status === 'AC' && resolvedContest) {
          try {
            const payload = await computeLeaderboard(resolvedContest._id);
            const { io } = require('../server');
            io.to(resolvedContest._id.toString()).emit('leaderboard-update', payload);
          } catch (lbErr) {
            console.error('Leaderboard broadcast failed:', lbErr.message);
          }

          // Trigger algoforge-leaderboard service update (fire-and-forget)
          axios.post(`${LEADERBOARD_URL}/update-leaderboard`, {}).catch((err) => {
            console.error('Algoforge leaderboard update failed:', err.message);
          });
        }
      })
      .catch(async (err) => {
        // Fallback: mark as Internal Error so it doesn't stay PEND forever
        console.error('Background execution engine panicked:', err.message);
        await Submission.findByIdAndUpdate(submission._id, {
          $set: {
            status: 'IE',
            'logs.stderr': truncate(`Internal Error: ${err.message}\n${err.stack || ''}`)
          }
        });
      });

  } catch (error) {
    console.error('Create submission error:', error);
    if (error.stack) console.error(error.stack);
    console.error('Context: problemId=%s userId=%s', problemId, userId);
    if (!res.headersSent) {
      const message = process.env.NODE_ENV !== 'production'
        ? error.message
        : 'Database transaction failed.';
      res.status(500).json({ success: false, error: message });
    }
  }
};

/**
 * Run code with a single test input (no submission record). Used by "Run" button.
 * Body: { code (Base64), language, input? }
 */
exports.runSubmission = async (req, res) => {
  const { code, language, input, expectedOutput } = req.body;
  try {
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: 'code and language are required.',
      });
    }
    let decodedCode;
    try {
      decodedCode = decodeBase64Code(code);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Malformed Base64 payload. Could not decode source code.',
      });
    }
    if (Buffer.byteLength(decodedCode, 'utf-8') > MAX_CODE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Source code exceeds the ${MAX_CODE_BYTES}-byte limit.`,
      });
    }
    const validLanguages = ['cpp', 'c', 'java', 'python', 'javascript'];
    const lang = language.toLowerCase();
    if (!validLanguages.includes(lang)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Use one of: ${validLanguages.join(', ')}.`,
      });
    }
    const runPayload = {
      runOnly: true,
      submissionId: null,
      code: decodedCode,
      language: lang,
      timeLimit: 5000,
      memoryLimit: 256000,
      testCases: [{ input: typeof input === 'string' ? input : '', output: '' }],
    };
    const result = await judgePool.run(runPayload);
    if (!result.runOnly) {
      return res.status(500).json({ success: false, error: 'Run endpoint returned full judge result.' });
    }
    return res.json({
      success: result.status === 'OK',
      status: result.status,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      executionTimeMs: result.executionTimeMs ?? 0,
      expectedOutput: typeof expectedOutput === 'string' ? expectedOutput : '',
    });
  } catch (error) {
    console.error('Run submission error:', error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV !== 'production' ? error.message : 'Execution failed.',
    });
  }
};
