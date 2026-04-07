const path = require("path");
const { Piscina } = require("piscina");
const os = require("os");

const maxThreads = Math.max(1, os.cpus().length - 1);

const judgePool = new Piscina({
  filename: path.resolve(__dirname, "worker.js"),
  minThreads: 2,
  maxThreads,
  maxQueue: 1000,
  idleTimeout: 30000,
});

const addJobToQueue = async (jobPayload) => {
  try {
    return await judgePool.run(jobPayload);
  } catch (error) {
    return {
      status: "IE",
      executionTime: 0,
      memoryUsed: 0,
      logs: { stderr: `Judge Core Failure: ${error.message}` },
    };
  }
};

module.exports = { addJobToQueue, judgePool };
