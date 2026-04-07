/**
 * orphanReaper.js
 * ──────────────────────────────────────────────────────────────────────
 * Self-healing background job that marks stale submissions as IE.
 *
 * Edge Case Mitigated:
 *   If the Express server saves a PEND state, fires the background
 *   execution engine, but the server crashes before the engine resolves,
 *   the submission is permanently stuck in PEND ("ghost submission").
 *
 * This job runs on a 60-second interval, querying for any Submission
 * stuck in PEND or RUN where `createdAt` is older than 5 minutes,
 * and bulk-updates them to IE (Internal Error).
 */

const Submission = require('../models/Submission');

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const REAP_INTERVAL_MS = 60 * 1000;     // Run every 60 seconds

async function reapOrphanedSubmissions() {
    try {
        const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

        const result = await Submission.updateMany(
            {
                status: { $in: ['PEND', 'RUN'] },
                createdAt: { $lt: cutoff }
            },
            {
                $set: {
                    status: 'IE',
                    'logs.stderr': 'Reaped: submission exceeded 5-minute processing threshold.'
                }
            }
        );

        if (result.modifiedCount > 0) {
            console.log(
                `[OrphanReaper] Reaped ${result.modifiedCount} stale submission(s) older than ${STALE_THRESHOLD_MS / 1000}s.`
            );
        }
    } catch (error) {
        console.error('[OrphanReaper] Failed to reap orphaned submissions:', error.message);
    }
}

/**
 * Start the orphan reaper interval.
 * Call once at server startup, after `connectDB()`.
 */
function startOrphanReaper() {
    console.log('[OrphanReaper] Started — checking every 60s for stale PEND/RUN submissions.');
    // Run once immediately on startup to catch any leftovers from a previous crash
    reapOrphanedSubmissions();
    // Then schedule recurring
    setInterval(reapOrphanedSubmissions, REAP_INTERVAL_MS);
}

module.exports = { startOrphanReaper, reapOrphanedSubmissions };
