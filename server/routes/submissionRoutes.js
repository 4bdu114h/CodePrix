const express = require("express");
const protect = require("../middleware/authMiddleware");
const { createSubmission, getSubmission } = require("../controllers/submissionController");
const Submission = require("../models/Submission");

const router = express.Router();

// Submit solution (protected) — delegates to bel-Forge via controller
router.post("/", protect, createSubmission);

// Get all submissions for logged-in user
router.get("/my", protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ user: req.user.id })
      .populate("problem", "title difficulty");

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single submission by ID
router.get("/:id", protect, getSubmission);

module.exports = router;