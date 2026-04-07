const Submission = require("../models/Submission");

/**
 * GET /api/users/profile/stats
 * Protected — uses req.user.id exclusively (no IDOR via URL params).
 *
 * Runs four queries concurrently via Promise.all():
 *   1. Total submissions count
 *   2. Total AC count
 *   3. Unique problems solved (distinct problemIds with AC)
 *   4. 10 most-recent submissions (with problem title/difficulty, stripped of code/logs)
 */
exports.getProfileStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const [totalSubmissions, totalAC, uniqueSolvedIds, recentSubmissions] =
            await Promise.all([
                // 1. Total submission count
                Submission.countDocuments({ user: userId }),

                // 2. Total accepted count
                Submission.countDocuments({ user: userId, status: "AC" }),

                // 3. Unique problems solved (only IDs — counted client-side)
                Submission.distinct("problem", { user: userId, status: "AC" }),

                // 4. Recent submissions — stripped of heavy fields
                Submission.find({ user: userId })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .populate("problem", "title difficulty")
                    .select("-code -logs"),
            ]);

        // ── Derived Metrics ───────────────────────────────────────────────
        const uniqueSolved = uniqueSolvedIds.length;
        const accuracyRate =
            totalSubmissions > 0
                ? parseFloat(((totalAC / totalSubmissions) * 100).toFixed(1))
                : 0;

        return res.json({
            success: true,
            stats: {
                totalSubmissions,
                totalAC,
                uniqueSolved,
                accuracyRate,
                recentSubmissions,
            },
        });
    } catch (error) {
        console.error("Profile stats error:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
