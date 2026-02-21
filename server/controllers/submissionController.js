const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Problem = require('../models/Problem');
const Contest = require('../models/Contest');
const { addJobToQueue } = require('../bel-Forge/judge-main/queue');
const axios = require('axios'); // For communicating with the standalone Leaderboard app

exports.getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('problem', 'title difficulty')
      .select('-code');
    if (!submission) return res.status(404).json({ success: false, error: 'Submission not found.' });
    if (submission.user.toString() !== req.user.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this submission.' });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const SUPPORTED_LANGUAGES = ['cpp', 'java', 'python', 'javascript'];
const MAX_CODE_LENGTH = 65536; // 64KB

exports.createSubmission = async (req, res) => {
  const { problemId, code, language } = req.body;
  const userId = req.user; // authMiddleware sets req.user = decoded.id

  // Input validation
  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'code is required.' });
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_LENGTH) {
    return res.status(400).json({ success: false, error: `code must not exceed ${MAX_CODE_LENGTH} bytes.` });
  }
  if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({
      success: false,
      error: `language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    });
  }

  try {
    // Validate problemId presence and format before any DB I/O
    if (!problemId || !mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ success: false, error: 'problemId is required and must be a valid ObjectId.' });
    }

    // Validate problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found.' });
    }

    // Optional contest time window: look for an active contest but don't reject if none found
    const now = new Date();
    const activeContest = await Contest.findOne({
      problems: problemId,
      startTime: { $lte: now },
      endTime: { $gte: now },
    });

    const timeLimit = 2000;    // ms, default 2s
    const memoryLimit = 256000; // KB, default 256MB

    // 1. Synchronous Database Commit (State: PEND)
    const submission = new Submission({
      user: userId,
      problem: problemId,
      contest: activeContest ? activeContest._id : null,
      code,
      language
    });
    await submission.save();

    // 2. Release HTTP Request
    res.status(202).json({
      success: true,
      submissionId: submission._id,
      status: submission.status,
      message: 'Submission enqueued successfully.'
    });

    // 3. Asynchronous Execution Pipeline (Background)
    addJobToQueue({
      submissionId: submission._id,
      code,
      language,
      timeLimit,
      memoryLimit,
      testCases: problem.testCases || []
    })
      .then(async (result) => {
        const judgedAt = new Date();
        // 4. Update Database with Terminal State
        await Submission.findByIdAndUpdate(submission._id, {
          $set: {
            status: result.status,
            'metrics.time': result.executionTime,
            'metrics.memory': result.memoryUsed,
            failedTestCase: result.failedTestCase ?? null,
            logs: result.logs
          }
        });

        // 5. Leaderboard Service Synchronization (Only on Accepted, only when in a contest)
        if (result.status === 'AC' && activeContest) {
          const LEADERBOARD_URL = process.env.LEADERBOARD_URL || 'http://localhost:5000';
          await axios.post(`${LEADERBOARD_URL}/update-leaderboard`, {
            userId,
            problemId,
            contestId: activeContest._id,
            timestamp: judgedAt // Time when the submission was judged as AC
          }).catch(err => console.error('Leaderboard Sync Failed:', err.message));
        }
      })
      .catch(async (err) => {
        console.error('Background submission update failed:', err.message);
        // Mark submission as Internal Error so it doesn't stay PEND forever
        await Submission.findByIdAndUpdate(submission._id, { $set: { status: 'IE' } });
      });

  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Database transaction failed.' });
    }
  }
};
