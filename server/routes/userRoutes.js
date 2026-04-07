const express = require("express");
const protect = require("../middleware/authMiddleware");
const { getProfileStats } = require("../controllers/userController");

const router = express.Router();

// Protected route — basic profile info
router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Access granted to protected route",
    userId: req.user.id,
  });
});

// Protected route — dashboard stats (aggregated metrics)
// Strictly uses req.user.id — no IDOR via URL params
router.get("/profile/stats", protect, getProfileStats);

module.exports = router;