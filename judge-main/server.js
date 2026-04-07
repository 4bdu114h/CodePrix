const express = require("express");
const cors = require("cors");
const { addJobToQueue } = require("./queue");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: "*" }));

app.post("/execute", async (req, res) => {
  const { code, language, input = "", timeLimit = 2, memoryLimit = 256 } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, error: "INVALID_REQUEST", message: "Code and language are required" });
  }

  try {
    const result = await addJobToQueue({ code, language, input, timeLimit, memoryLimit });

    if (!result.success) {
      return res.status(200).json({
        success: false,
        error: result.error || "EXECUTION_ERROR",
        message: result.message || "Execution failed",
        details: result.details || {},
        timeTaken: result.timeTaken || null,
      });
    }

    return res.status(200).json({
      success: true,
      output: result.output || "",
      timeTaken: result.timeTaken,
      status: "SUCCESS",
    });
  } catch (error) {
    return res.status(200).json({
      success: false,
      error: "SYSTEM_ERROR",
      message: error.message || "Unexpected judge error",
      details: {},
      timeTaken: null,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Judge running on ${PORT}`);
});
