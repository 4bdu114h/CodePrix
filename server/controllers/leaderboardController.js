const mongoose = require("mongoose");
const Submission = require("../models/Submission");
const Contest = require("../models/Contest");

/**
 * Compute the leaderboard for a contest using MongoDB aggregation.
 * Returns { rank_list: [...], timestamp: number }
 *
 * Pipeline stages:
 *   1. $match  — AC submissions for this contest
 *   2. $sort   — chronological (first-solve timestamp kept)
 *   3. $group  — unique problems via $addToSet, latest AC via $max
 *   4. $sort   — score DESC, latestAC ASC (tie-breaker)
 *   5. $lookup — join Users for name/email
 */
async function computeLeaderboard(contestId) {
    const cid =
        typeof contestId === "string"
            ? new mongoose.Types.ObjectId(contestId)
            : contestId;

    // ── Aggregation Pipeline ────────────────────────────────────────────
    const pipeline = [
        // Stage 1: Only accepted submissions for this contest
        { $match: { contest: cid, status: "AC" } },

        // Stage 2: Chronological sort (ensures $first/$addToSet see earliest first)
        { $sort: { createdAt: 1 } },

        // Stage 3: Group by user — unique problems solved + latest AC time
        {
            $group: {
                _id: "$user",
                problemsSolvedIds: { $addToSet: "$problem" },
                latestAC: { $max: "$createdAt" },
            },
        },

        // Compute score (size of unique problems set)
        { $addFields: { score: { $size: "$problemsSolvedIds" } } },

        // Stage 4: Primary = score DESC, Secondary = latestAC ASC (faster finisher wins)
        { $sort: { score: -1, latestAC: 1 } },

        // Stage 5: Join Users collection for display name
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "userInfo",
            },
        },
        { $unwind: "$userInfo" },

        // Project only safe fields
        {
            $project: {
                _id: 0,
                user: {
                    _id: "$userInfo._id",
                    name: "$userInfo.name",
                    email: "$userInfo.email",
                },
                score: 1,
                latestAC: 1,
                problemsSolvedIds: 1,
            },
        },
    ];

    const rankedUsers = await Submission.aggregate(pipeline);

    // ── Zero-Score Ghost Town Mitigation ────────────────────────────────
    // Append registered users who haven't solved anything yet
    const contest = await Contest.findById(cid)
        .select("registeredUsers")
        .populate("registeredUsers", "name email")
        .lean();

    if (contest?.registeredUsers?.length) {
        const solvedUserIds = new Set(
            rankedUsers.map((r) => r.user._id.toString())
        );

        for (const regUser of contest.registeredUsers) {
            if (!solvedUserIds.has(regUser._id.toString())) {
                rankedUsers.push({
                    user: {
                        _id: regUser._id,
                        name: regUser.name,
                        email: regUser.email,
                    },
                    score: 0,
                    latestAC: null,
                    problemsSolvedIds: [],
                });
            }
        }
    }

    return {
        rank_list: rankedUsers,
        timestamp: Date.now(),
    };
}

/**
 * REST handler: GET /api/contests/:id/leaderboard
 * Returns the current leaderboard snapshot for the contest.
 */
async function getLeaderboard(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid contest ID." });
        }

        const payload = await computeLeaderboard(id);
        return res.json({ success: true, ...payload });
    } catch (error) {
        console.error("Leaderboard computation error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { computeLeaderboard, getLeaderboard };
