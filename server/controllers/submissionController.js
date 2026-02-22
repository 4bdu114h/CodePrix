const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Contest = require('../models/Contest');
const { addJobToQueue } = require('../bel-Forge/judge-main/queue');
const axios = require('axios'); // For communicating with the standalone Leaderboard app

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
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found.' });
    }

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
        (pid) => pid.toString() === problemId.toString()
      );
      if (!problemInContest) {
        return res.status(400).json({
          success: false,
          error: 'This problem does not belong to the specified contest.'
        });
      }
    } else {
      // No explicit contestId: auto-detect active contest for this problem
      resolvedContest = await Contest.findOne({
        problems: problemId,
        startTime: { $lte: now },
        endTime: { $gte: now },
      });
      if (!resolvedContest) {
        return res.status(400).json({
          success: false,
          error: 'No active contest for this problem. Submissions are only accepted during the contest window.',
        });
      }
    }

    const timeLimit = problem.timeLimit ?? 2000;       // ms, default 2s
    const memoryLimit = problem.memoryLimit ?? 256000;  // KB, default 256MB

    // ── 5. Synchronous Database Commit (State: PEND) ────────────────
    const submission = new Submission({
      user: userId,
      problem: problemId,
      contest: resolvedContest._id,
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
      testCases: problem.testCases || []
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

        // Leaderboard Service Synchronization (Only on Accepted)
        if (result.status === 'AC') {
          const LEADERBOARD_URL = process.env.LEADERBOARD_URL || 'http://localhost:5000';
          await axios.post(`${LEADERBOARD_URL}/update-leaderboard`, {
            userId,
            problemId,
            contestId: resolvedContest._id,
            timestamp: submission.createdAt // Critical for tie-breaking
          }).catch(err => console.error('Leaderboard Sync Failed:', err.message));
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
