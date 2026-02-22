const express = require("express");
const rateLimit = require("express-rate-limit");
const protect = require("../middleware/authMiddleware");
const { createSubmission, getSubmission } = require("../controllers/submissionController");
const Submission = require("../models/Submission");

const router = express.Router();

// ── Submission Rate Limiter ─────────────────────────────────────────
// 1 submission per 10 seconds per IP — prevents child_process flood
const submissionLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Execution engine cooling down. Please wait 10 seconds." },
});

// Submit solution (protected + rate-limited) — delegates to bel-Forge via controller
router.post("/", protect, submissionLimiter, createSubmission);

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