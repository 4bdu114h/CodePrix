const express = require("express");
const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const Contest = require("../models/Contest");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Submit solution (protected)
router.post("/", protect, async (req, res) => {
    try {
      const { problemId, code, language } = req.body;
  
      // 1️⃣ Check if problem exists
      const problem = await Problem.findById(problemId);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
  
      // 2️⃣ Contest time check (ADD THIS PART)
      const Contest = require("../models/Contest"); // add at top ideally
  
      const now = new Date();
  
      const activeContest = await Contest.findOne({
        problems: problemId,
        startTime: { $lte: now },
        endTime: { $gte: now },
      });
  
      if (!activeContest) {
        return res.status(400).json({
          message: "No active contest for this problem",
        });
      }
  
      // 3️⃣ Temporary evaluation logic (fake judge)
      let verdict = "Wrong Answer";
  
      if (code.includes("return")) {
        verdict = "Accepted";
      }
  
      // 4️⃣ Save submission
      const submission = await Submission.create({
        user: req.user,
        problem: problemId,
        code,
        language,
        verdict,
      });
  
      res.status(201).json(submission);
  
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

// Get all submissions for logged-in user
router.get("/my", protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user })
      .populate("problem", "title difficulty");

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;