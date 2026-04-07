const express = require("express");
const axios = require("axios");
const router = express.Router();
const protect = require("../middleware/authMiddleware");

const LEADERBOARD_URL = process.env.LEADERBOARD_URL || "http://localhost:5001";

/**
 * POST /api/leaderboard/update
 * Triggers the algoforge-leaderboard service to recompute active leaderboards.
 */
router.post("/update", protect, async (req, res) => {
  try {
    const response = await axios.post(`${LEADERBOARD_URL}/update-leaderboard`, {});
    res.json({ success: true, data: response.data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Leaderboard service unavailable";
    res.status(502).json({ success: false, error: msg });
  }
});

/**
 * POST /api/leaderboard/get
 * Fetches leaderboard data from the algoforge-leaderboard service.
 * Body: { contest_link_code: string }
 */
router.post("/get", protect, async (req, res) => {
  try {
    const { contest_link_code } = req.body;
    const response = await axios.post(`${LEADERBOARD_URL}/get-leaderboard`, {
      contest_link_code,
    });
    res.json({ success: true, data: response.data });
  } catch (err) {
    const msg = err.response?.data?.message || err.message || "Leaderboard service unavailable";
    const status = err.response?.status || 502;
    res.status(status).json({ success: false, error: msg });
  }
});

module.exports = router;
