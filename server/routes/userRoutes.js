const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Protected route
router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Access granted to protected route",
    userId: req.user,
  });
});

module.exports = router;