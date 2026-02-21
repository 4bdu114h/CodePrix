const LeaderBoard = require('../models/LeaderBoardModel');
const Submission = require('../models/SubmissionModel');
const User = require('../models/UserModel');

module.exports = async (req, res) => {
    try {
        const now = new Date(); // current time

        // Find all leaderboards where: startTime < now and endTime > now - 10 mins
        // (i.e., contests that are ongoing or ended within the last 10 minutes)
        const leaderboardsToUpdate = await LeaderBoard.find({
            startTime: { $lt: now },
            endTime: { $gt: new Date(now.getTime() - 10 * 60 * 1000) },
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

            // First pass: collect unique author IDs from submissions
            for (const submission of allSubmissions) {
                if (submission.author) {
                    userIdSet.add(submission.author.toString());
                }
            }

            // Fetch all required users in a single query
            const users = await User.find(
                { _id: { $in: Array.from(userIdSet) } },
                { email: 1, username: 1 } // only fetch required fields
            ).lean();

            // Reinitialize maps and userIdSet to only include users that actually exist
            userIdSet = new Set();
            for (const user of users) {
                const userId = user._id.toString();
                userIdSet.add(userId);
                userIdToEmailMap.set(userId, user.email);
                userIdToNameMap.set(userId, user.username);
                userIdToProblemsSolvedMap.set(userId, []);
                userIdtoLatestACMap.set(userId, 0);
                userIdToScoreMap.set(userId, 0);
            }

            // Second pass: process submissions using pre-fetched user data
            for (const submission of allSubmissions) {
                const { author, createdAt, status, problem } = submission;
                if (!author) continue;

                const problemId = problem.toString();
                const authorId = author.toString();

                // Skip submissions whose authors are not present in the users collection
                if (!userIdSet.has(authorId)) {
                    continue;
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

            await LeaderBoard.findOneAndUpdate(
                { _id: leaderboard._id },
                {
                    $set: {
                        rank_list: newLeaderBoardRankList,
                        last_updated: new Date(),
                    },
                },
                { runValidators: true, context: 'query' }
            );
        }

        return res.status(200).json({ message: 'Eligible leaderboards updated successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};
