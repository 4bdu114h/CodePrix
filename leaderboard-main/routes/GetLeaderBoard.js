const GetLeaderBoard = require("../controllers/GetLeaderBoard");
const router = require("express").Router();

router.post("/get-leaderboard", GetLeaderBoard);

module.exports = router;