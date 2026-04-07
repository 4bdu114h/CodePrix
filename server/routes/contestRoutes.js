const express = require("express");
const router = express.Router();
const Contest = require("../models/Contest");
const protect = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/adminMiddleware");
const { generateContest } = require("../controllers/contestController");
const { getLeaderboard } = require("../controllers/leaderboardController");

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

// Register for a contest (adds user to registeredUsers via $addToSet)
router.post("/:id/register", protect, async (req, res) => {
  try {
    const contest = await Contest.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { registeredUsers: req.user.id } },
      { new: true }
    );

    if (!contest) {
      return res.status(404).json({ success: false, error: "Contest not found." });
    }

    res.json({ success: true, message: "Registered successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard for a contest (REST endpoint for initial load)
router.get("/:id/leaderboard", protect, getLeaderboard);

module.exports = router;