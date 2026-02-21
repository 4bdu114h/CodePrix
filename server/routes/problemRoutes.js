const express = require("express");
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

// GET all problems (with optional difficulty filter)
router.get("/", async (req, res) => {
  try {
    const { difficulty } = req.query;

    const filter = difficulty ? { difficulty } : {};

    const problems = await Problem.find(filter);

    res.json(problems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single problem
router.get("/:id", async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.json(problem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;