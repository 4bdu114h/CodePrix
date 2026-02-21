const express = require("express");
const router = express.Router();
const Contest = require("../models/Contest");
const protect = require("../middleware/authMiddleware");

// Create contest (requires authentication)
router.post("/", protect, async (req, res) => {
  try {
    const { title, problems, startTime, endTime } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (!start.getTime() || !end.getTime()) {
      return res.status(400).json({ message: "Invalid startTime or endTime." });
    }
    if (start >= end) {
      return res.status(400).json({ message: "startTime must be before endTime." });
    }

    const contest = await Contest.create({
      title,
      problems,
      startTime: start,
      endTime: end,
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