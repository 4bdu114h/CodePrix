const UpdateLeaderBoard = require('../controllers/UpdateLeaderBoard');
const router = require('express').Router();

router.post('/update-leaderboard', UpdateLeaderBoard);

module.exports = router;