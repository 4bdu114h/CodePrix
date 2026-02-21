const express = require("express");
const { addJobToQueue } = require("./queue");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

app.post("/execute", async (req, res) => {
  let { code, language, input, timeLimit, memoryLimit } = req.body;

  if (timeLimit === undefined) {
    timeLimit = 1;
  }

  if (memoryLimit === undefined) {
    memoryLimit = 256;
  }

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }
  try {
    const result = await addJobToQueue({
      code,
      language,
      input: input || '',
      timeLimit,
      memoryLimit,
      testCases: [],
    });
    console.log("Execution Result:", result);

    const { status, executionTime, memoryUsed, logs } = result || {};
    const isSuccess = !['CE', 'TLE', 'MLE', 'RE', 'IE'].includes(status);

    if (!isSuccess) {
      res.status(200).json({
        success: false,
        status: status || 'FAILED',
        error: status || 'EXECUTION_ERROR',
        message: logs?.stderr || 'Execution failed',
        logs,
        memoryUsed,
        timeTaken: executionTime ?? null,
      });
    } else {
      res.status(200).json({
        success: true,
        status: status || 'SUCCESS',
        output: logs?.stdout || '',
        timeTaken: executionTime ?? null,
        memoryUsed,
        logs,
      });
    }
  } catch (error) {
    console.error("Execution Failed in API:", error);

    res.status(200).json({
      success: false,
      error: error.error || "SYSTEM_ERROR",
      message: error.message || "An unexpected error occurred",
      details: error.details || { stderr: error.message || "Unknown error" },
      logs: error.logs,
      memoryUsed: error.memoryUsed,
      timeTaken: error.executionTime ?? error.details?.timeTaken ?? null,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
