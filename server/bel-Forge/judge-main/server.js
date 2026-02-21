const express = require("express");
const { addJobToQueue } = require("./queue");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

app.post("/execute", async (req, res) => {
  const { code, language, input, timeLimit = 1, memoryLimit = 256 } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: "Code and language are required" });
  }
  try {
    const result = await addJobToQueue({
      code,
      language,
      input,
      timeLimit,
      memoryLimit
    });
    console.log("Execution Result:", result);
    
    // Always return a consistent response format
    if (result.error) {
      // Error case - return detailed error information
      res.status(200).json({
        success: false,
        error: result.error,
        message: result.message,
        details: result.details || {},
        timeTaken: result.details?.timeTaken || null,
        lineNumber: result.details?.lineNumber || null,
        column: result.details?.column || null
      });
    } else {
      // Success case
      res.status(200).json({
        success: true,
        output: result.output,
        timeTaken: result.timeTaken,
        status: result.status || "SUCCESS"
      });
    }
  } catch (error) {
    console.error("Execution Failed in API:", error);
    
    // Handle any unexpected errors
    res.status(200).json({
      success: false,
      error: error.error || "SYSTEM_ERROR",
      message: error.message || "An unexpected error occurred",
      details: error.details || { stderr: error.message || "Unknown error" },
      timeTaken: error.details?.timeTaken || null
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
