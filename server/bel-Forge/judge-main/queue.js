const path = require('path');
const { Piscina } = require('piscina');
const os = require('os');

// Reserve 1 core for the main Event Loop; allocate the rest to the Judge pool.
const maxThreads = Math.max(1, os.cpus().length - 1);

const judgePool = new Piscina({
  filename: path.resolve(__dirname, 'worker.js'),
  minThreads: 2,
  maxThreads: maxThreads,
  maxQueue: 1000, // Reject HTTP 429 if queue exceeds 1000 pending submissions
  idleTimeout: 30000 // Teardown idle V8 isolates after 30s to conserve RAM
});

/**
 * Dispatches a code execution job to the Piscina thread pool.
 * @param {Object} jobPayload - Must contain submissionId, code, language, and problem constraints.
 * @returns {Promise<Object>} Resolves with the execution state (AC, WA, TLE, etc.).
 */
const addJobToQueue = async (jobPayload) => {
  try {
    // Piscina `.run()` serializes the payload via the structured clone algorithm.
    const workerResult = await judgePool.run(jobPayload);
    return workerResult;
  } catch (error) {
    // Catch Piscina operational errors (e.g., TaskQueue full, worker crashed)
    return {
      status: 'IE',
      executionTime: 0,
      memoryUsed: 0,
      logs: { stderr: `Judge Core Failure: ${error.message}` }
    };
  }
};

module.exports = { addJobToQueue, judgePool };
