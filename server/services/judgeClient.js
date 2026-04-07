/**
 * HTTP client adapter for algoforge-judge.
 * Exports addJobToQueue and judgePool.run to match the bel-Forge judge interface,
 * so submissionController can switch backends without code changes.
 *
 * Requires JUDGE_URL in .env (e.g. http://localhost:3000).
 */
const axios = require("axios");

const JUDGE_URL = process.env.JUDGE_URL || "http://localhost:3000";
const EXECUTE_ENDPOINT = `${JUDGE_URL.replace(/\/$/, "")}/execute`;

/**
 * Map algoforge-judge error codes to Submission schema status enums.
 */
function mapErrorToStatus(response) {
  if (!response || response.success) return "AC";
  const err = (response.error || "").toUpperCase();
  if (err.includes("COMPILATION")) return "CE";
  if (err.includes("TIME_LIMIT") || err.includes("TIMEOUT")) return "TLE";
  if (err.includes("MEMORY_LIMIT")) return "MLE";
  if (
    err.includes("RUNTIME") ||
    err.includes("SEGMENTATION") ||
    err.includes("ABORT") ||
    err.includes("FLOATING_POINT")
  ) {
    return "RE";
  }
  return "IE";
}

/**
 * Parse timeTaken string (e.g. "123ms") or number to milliseconds.
 */
function parseTimeTakenMs(val) {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  const match = s.match(/^([\d.]+)\s*(ms|s)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || "ms").toLowerCase();
  return unit === "s" ? num * 1000 : num;
}

/**
 * Call algoforge-judge POST /execute.
 * @param {Object} params - { code, language, input, timeLimit (seconds), memoryLimit (MB) }
 * @returns {Promise<{ success: boolean, output?: string, error?: string, message?: string, details?: Object, timeTaken?: string }>}
 */
async function callJudge({ code, language, input = "", timeLimitSec = 2, memoryLimitMB = 256 }) {
  const response = await axios.post(EXECUTE_ENDPOINT, {
    code,
    language,
    input: typeof input === "string" ? input : "",
    timeLimit: timeLimitSec,
    memoryLimit: memoryLimitMB,
  });
  return response.data;
}

/**
 * Run a single test case via algoforge-judge. Returns result in bel-Forge format.
 */
async function executeSingleTestCase(payload) {
  const { code, language, timeLimit, memoryLimit } = payload;
  const timeLimitSec = (timeLimit || 2000) / 1000;
  const memoryLimitMB = (memoryLimit || 256000) / 1024;

  const input = payload.testCases?.[0]?.input ?? payload.input ?? "";
  const body = { code, language, input, timeLimit: timeLimitSec, memoryLimit: memoryLimitMB };

  let data;
  try {
    data = await callJudge(body);
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Judge service unavailable";
    return {
      runOnly: true,
      status: "IE",
      stdout: "",
      stderr: msg.substring(0, 2048),
      executionTimeMs: 0,
    };
  }

  if (data.success) {
    return {
      runOnly: true,
      status: "OK",
      stdout: data.output || "",
      stderr: "",
      executionTimeMs: parseTimeTakenMs(data.timeTaken),
    };
  }

  const details = data.details || {};
  return {
    runOnly: true,
    status: mapErrorToStatus(data),
    stdout: (details.stdout || "").substring(0, 2048),
    stderr: (details.stderr || data.message || "").substring(0, 2048),
    executionTimeMs: parseTimeTakenMs(details.timeTaken || data.timeTaken) || 0,
  };
}

/**
 * Run full submission (all test cases). Loops over testCases, calls judge for each.
 */
async function executeFullSubmission(payload) {
  const { submissionId, code, language, timeLimit, memoryLimit, testCases } = payload;
  const timeLimitSec = (timeLimit || 2000) / 1000;
  const memoryLimitMB = (memoryLimit || 256000) / 1024;

  const cases = Array.isArray(testCases) && testCases.length > 0 ? testCases : [{ input: "", output: "" }];

  let maxTime = 0;
  let maxMemory = 0;

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    const input = tc.input || "";

    try {
      const data = await callJudge({
        code,
        language,
        input,
        timeLimitSec,
        memoryLimitMB,
      });

      if (!data.success) {
        const details = data.details || {};
        const status = mapErrorToStatus(data);
        return {
          submissionId,
          status,
          executionTime: parseTimeTakenMs(details.timeTaken || data.timeTaken) || 0,
          memoryUsed: 0,
          failedTestCase: i,
          logs: {
            stdout: (details.stdout || "").substring(0, 2048),
            stderr: (details.stderr || data.message || "").substring(0, 2048),
          },
        };
      }

      const actualOut = (data.output || "").replace(/\r\n/g, "\n").trim();
      const expectedOut = (tc.output || "").replace(/\r\n/g, "\n").trim();

      const elapsedMs = parseTimeTakenMs(data.timeTaken);
      maxTime = Math.max(maxTime, elapsedMs);

      if (actualOut !== expectedOut) {
        return {
          submissionId,
          status: "WA",
          executionTime: elapsedMs,
          memoryUsed: maxMemory,
          failedTestCase: i,
          logs: {
            stdout: actualOut.substring(0, 2048),
            stderr: "",
          },
        };
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Judge connection failed";
      return {
        submissionId,
        status: "IE",
        executionTime: 0,
        memoryUsed: 0,
        failedTestCase: i,
        logs: {
          stdout: "",
          stderr: msg.substring(0, 2048),
        },
      };
    }
  }

  return {
    submissionId,
    status: "AC",
    executionTime: maxTime,
    memoryUsed: maxMemory,
    failedTestCase: null,
    logs: { stdout: "", stderr: "" },
  };
}

/**
 * addJobToQueue(payload) - Async submission pipeline (fire-and-forget compatible).
 * Payload: { submissionId, code, language, timeLimit (ms), memoryLimit (KB), testCases }
 */
const addJobToQueue = async (payload) => {
  return executeFullSubmission(payload);
};

/**
 * judgePool.run(payload) - Synchronous run (for Run button).
 * Payload: { runOnly, code, language, timeLimit, memoryLimit, testCases }
 */
const judgePool = {
  run: async (payload) => {
    if (payload.runOnly && payload.testCases && payload.testCases.length === 1) {
      return executeSingleTestCase(payload);
    }
    const result = await executeFullSubmission(payload);
    return {
      runOnly: false,
      status: result.status,
      stdout: result.logs?.stdout ?? "",
      stderr: result.logs?.stderr ?? "",
      executionTimeMs: result.executionTime ?? 0,
    };
  },
};

module.exports = { addJobToQueue, judgePool };
