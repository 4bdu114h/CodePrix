const express = require("express");
const router = express.Router();
const Contest = require("../models/Contest");
const protect = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/adminMiddleware");
const { generateContest } = require("../controllers/contestController");

// Admin-only: generate contest via aggregation pipeline
router.post("/generate", protect, verifyAdmin, generateContest);
// Create contest
router.post("/", async (req, res) => {
  try {
    const { title, problems, startTime, endTime } = req.body;

    const contest = await Contest.create({
      title,
      problems,
      startTime,
      endTime,
    });

    res.status(201).json(contest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all contests
router.get("/", async (req, res) => {
  try {
    const contests = await Contest.find().populate("problems");
    res.json(contests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;