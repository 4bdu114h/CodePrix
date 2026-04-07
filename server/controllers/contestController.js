const Problem = require("../models/Problem");
const Contest = require("../models/Contest");

const VALID_DIFFICULTIES = ["Easy", "Medium", "Hard", "Random"];

/**
 * POST /api/contests/generate
 * Admin-only: dynamically generates a contest using MongoDB aggregation.
 */
exports.generateContest = async (req, res) => {
    try {
        const { difficulty, questionCount, durationMinutes } = req.body;

        // ── Validation Layer ──────────────────────────────────────────────
        const errors = [];

        if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
            errors.push(
                `difficulty must be one of: ${VALID_DIFFICULTIES.join(", ")}`
            );
        }

        if (
            !Number.isInteger(questionCount) ||
            questionCount < 1 ||
            questionCount > 20
        ) {
            errors.push("questionCount must be an integer between 1 and 20");
        }

        if (
            !Number.isInteger(durationMinutes) ||
            durationMinutes < 10 ||
            durationMinutes > 1440
        ) {
            errors.push(
                "durationMinutes must be an integer between 10 and 1440 (24h)"
            );
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        // ── MongoDB Aggregation Pipeline ──────────────────────────────────
        const pipeline = [];

        // Stage 1: $match — filter by difficulty + exclude zero-testcase problems
        const matchStage = { "testCases.0": { $exists: true } };
        if (difficulty !== "Random") {
            matchStage.difficulty = difficulty;
        }
        pipeline.push({ $match: matchStage });

        // Stage 2: $sample — DB-layer RNG for randomized selection
        pipeline.push({ $sample: { size: questionCount } });

        // Stage 3: $project — only return _id to minimize RAM
        pipeline.push({ $project: { _id: 1 } });

        const selectedProblems = await Problem.aggregate(pipeline);

        // ── Edge Case: Insufficient Problem Pool ──────────────────────────
        if (selectedProblems.length < questionCount) {
            return res.status(422).json({
                success: false,
                error: `Insufficient problem pool: requested ${questionCount} "${difficulty}" problems, but only ${selectedProblems.length} available (with test cases).`,
                available: selectedProblems.length,
                requested: questionCount,
            });
        }

        // ── Temporal Construction ─────────────────────────────────────────
        const problemIds = selectedProblems.map((p) => p._id);
        const startTime = new Date();
        const endTime = new Date(
            startTime.getTime() + durationMinutes * 60 * 1000
        );

        // Auto-generate title
        const diffLabel = difficulty === "Random" ? "Mixed" : difficulty;
        const dateLabel = startTime.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const title = `${diffLabel} Challenge — ${dateLabel}`;

        // ── Database Commit ───────────────────────────────────────────────
        const contest = await Contest.create({
            title,
            problems: problemIds,
            startTime,
            endTime,
        });

        return res.status(201).json({
            success: true,
            contestId: contest._id,
            title: contest.title,
            problemCount: problemIds.length,
            startTime: contest.startTime,
            endTime: contest.endTime,
        });
    } catch (error) {
        console.error("Contest generation error:", error);
        return res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};
