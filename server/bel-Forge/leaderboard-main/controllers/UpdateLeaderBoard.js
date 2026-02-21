const LeaderBoard = require('../models/LeaderBoardModel');
const Submission = require('../models/SubmissionModel');
const User = require('../models/UserModel');

module.exports = async (req, res) => {
    try {
        const fetchtime = new Date(Date.now() - 10 * 60 * 1000); // now - 10 mins

        // Find all leaderboards where: startTime < fetchtime < endTime + 10 mins
        const leaderboardsToUpdate = await LeaderBoard.find({
            startTime: { $lt: fetchtime },
            endTime: { $gt: new Date(fetchtime.getTime() - 10 * 60 * 1000) },
        });

        for (const leaderboard of leaderboardsToUpdate) {
            const { contest_link_code, startTime, endTime } = leaderboard;

            const allSubmissions = await Submission.find({
                contest_link_code,
                createdAt: {
                    $gt: startTime,
                    $lt: endTime,
                },
            });

            let newLeaderBoardRankList = [];
            let userIdSet = new Set();
            let userIdToEmailMap = new Map();
            let userIdToNameMap = new Map();
            let userIdToProblemsSolvedMap = new Map();
            let userIdtoLatestACMap = new Map();
            let userIdToScoreMap = new Map();

            for (const submission of allSubmissions) {
                const { author, createdAt, status, problem } = submission;
                const problemId = problem.toString();

                // normalize ObjectId → string
                const authorId = author.toString();

                if (!userIdSet.has(authorId)) {
                    const user = await User.findById(authorId);
                    if (!user) continue;

                    userIdSet.add(authorId);
                    userIdToEmailMap.set(authorId, user.email);
                    userIdToNameMap.set(authorId, user.username);
                    userIdToProblemsSolvedMap.set(authorId, []);
                    userIdtoLatestACMap.set(authorId, 0);
                    userIdToScoreMap.set(authorId, 0);
                }

                if (
                    status === 'AC' &&
                    !userIdToProblemsSolvedMap.get(authorId).includes(problemId)
                ) {
                    userIdToProblemsSolvedMap.get(authorId).push(problemId);
                    userIdtoLatestACMap.set(authorId, createdAt);
                    userIdToScoreMap.set(authorId, userIdToScoreMap.get(authorId) + 1);
                }
            }

            userIdSet.forEach((userId) => {
                newLeaderBoardRankList.push({
                    user: {
                        email: userIdToEmailMap.get(userId),
                        name: userIdToNameMap.get(userId),
                    },
                    score: userIdToScoreMap.get(userId),
                    latestAC: userIdtoLatestACMap.get(userId),
                    problemsSolvedIds: userIdToProblemsSolvedMap.get(userId),
                });
            });

            newLeaderBoardRankList.sort((a, b) => {
                if (b.score === a.score) {
                    return new Date(a.latestAC) - new Date(b.latestAC);
                }
                return b.score - a.score;
            });

            leaderboard.rank_list = newLeaderBoardRankList;
            leaderboard.last_updated = new Date();
            await leaderboard.save();
        }

        return res.status(200).json({ message: 'Eligible leaderboards updated successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};
