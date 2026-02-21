const LeaderBoard = require('../models/LeaderBoardModel');

module.exports = async (req, res) => {
    try {
        const { contest_link_code } = req.body;
        const leaderBoard = await LeaderBoard.find({contest_link_code});
        if (!leaderBoard || leaderBoard.length === 0) {
            return res.status(404).json({ message: "LeaderBoard not found" });
        }

        const leaderBoardToSend = []

        //send leaderboard without leaderboard._id and createdAt
        leaderBoard.forEach((leader) => {
            const { _id, createdAt, ...rest } = leader._doc;
            leaderBoardToSend.push(rest);
        });

        res.status(200).json(leaderBoardToSend);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}