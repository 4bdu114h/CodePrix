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
    if (submission.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this submission.' });
    }
    res.json(submission);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSubmission = async (req, res) => {
  const { problemId, code, language } = req.body;
  const userId = req.user.id; // authMiddleware sets req.user = decoded (full payload)

  try {
    // Validate inputs
    if (!problemId || !code || !language) {
      return res.status(400).json({
        success: false,
        error: 'problemId, code, and language are required.'
      });
    }

    // Validate problem exists and fetch constraints (timeLimit/memoryLimit when added to Problem schema)
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ success: false, error: 'Problem not found.' });
    }

    // Contest time window: submissions only allowed during an active contest
    const now = new Date();
    const activeContest = await Contest.findOne({
      problems: problemId,
      startTime: { $lte: now },
      endTime: { $gte: now },
    });
    if (!activeContest) {
      return res.status(400).json({
        success: false,
        error: 'No active contest for this problem. Submissions are only accepted during the contest window.',
      });
    }

    const timeLimit = problem.timeLimit ?? 2000;   // ms, default 2s
    const memoryLimit = problem.memoryLimit ?? 256000; // KB, default 256MB

    // 1. Synchronous Database Commit (State: PEND)
    const submission = new Submission({
      user: userId,
      problem: problemId,
      contest: activeContest._id,
      code,
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
      testCases: problem.testCases || [] // For future full judge: run against each test case
    })
      .then(async (result) => {
        // 4. Update Database with Terminal State
        await Submission.findByIdAndUpdate(submission._id, {
          $set: {
            status: result.status,
            'metrics.time': result.executionTime,
            'metrics.memory': result.memoryUsed,
            failedTestCase: result.failedTestCase || null,
            logs: result.logs
          }
        });

        // 5. Leaderboard Service Synchronization (Only on Accepted)
        if (result.status === 'AC') {
          const LEADERBOARD_URL = process.env.LEADERBOARD_URL || 'http://localhost:5000';
          await axios.post(`${LEADERBOARD_URL}/update-leaderboard`, {
            userId,
            problemId,
            contestId: activeContest._id,
            timestamp: submission.createdAt // Critical for tie-breaking
          }).catch(err => console.error('Leaderboard Sync Failed:', err.message));
        }
      })
      .catch(async (err) => {
        console.error('Background submission update failed:', err.message);
        // Mark submission as Internal Error so it doesn't stay PEND forever
        await Submission.findByIdAndUpdate(submission._id, { $set: { status: 'IE' } });
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
