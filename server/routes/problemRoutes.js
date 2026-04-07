const express = require("express");
const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// CREATE problem (protected)
router.post("/", protect, async (req, res) => {
  try {
    const problem = await Problem.create(req.body);
    res.status(201).json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all problems (with optional difficulty filter + pagination)
router.get("/", async (req, res) => {
  try {
    const { difficulty, page: pageStr, limit: limitStr } = req.query;

    const filter = difficulty ? { difficulty } : {};
    const page = Math.max(parseInt(pageStr, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(limitStr, 10) || 500, 1), 1000);
    const skip = (page - 1) * limit;

    const [problems, totalCount] = await Promise.all([
      Problem.find(filter)
        .sort({ problemId: 1, _id: 1 })
        .skip(skip)
        .limit(limit),
      Problem.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      problems,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET problem by numeric problemId (for practice page URL /problems/12)
router.get("/by-number/:num", async (req, res) => {
  try {
    const num = parseInt(req.params.num, 10);
    if (isNaN(num)) {
      return res.status(400).json({ message: "Invalid problem number" });
    }
    const problem = await Problem.findOne({ problemId: num });
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single problem by ObjectId or numeric problemId
router.get("/:id", async (req, res) => {
  try {
    let problem;

    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Valid ObjectId — look up directly
      problem = await Problem.findById(req.params.id);
    }

    // If not found by ObjectId (or wasn't a valid ObjectId), try numeric problemId
    if (!problem) {
      const num = parseInt(req.params.id, 10);
      if (!isNaN(num)) {
        problem = await Problem.findOne({ problemId: num });
      }
    }

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;