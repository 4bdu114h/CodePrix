import { useState, useEffect, useRef, useCallback } from "react";
import apiClient from "@/lib/apiClient";

// ── Types ────────────────────────────────────────────────────────────

/** Status codes matching the backend Submission model enum */
export type SubmissionStatus =
    | "PEND"
    | "RUN"
    | "AC"
    | "WA"
    | "TLE"
    | "MLE"
    | "RE"
    | "CE"
    | "IE";

export interface SubmissionPayload {
    _id: string;
    status: SubmissionStatus;
    metrics: { time: number; memory: number };
    failedTestCase: number | null;
    logs: { stdout: string; stderr: string };
    problem?: { title: string; difficulty: string };
}

export interface UseSubmissionStatusResult {
    submission: SubmissionPayload | null;
    isPolling: boolean;
    error: string | null;
}

// ── Constants ────────────────────────────────────────────────────────

const TERMINAL_STATES: ReadonlySet<SubmissionStatus> = new Set([
    "AC", "WA", "TLE", "MLE", "RE", "CE", "IE",
]);

const BASE_INTERVAL_MS = 1200;
const MAX_INTERVAL_MS = 10000;
const BACKOFF_MULTIPLIER = 2;

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * Polls `GET /api/proxy/submissions/:id` until a terminal status is reached.
 *
 * Features:
 *   - Memory-safe: clears interval on unmount or terminal state
 *   - Page Visibility API: forces immediate fetch when tab regains focus
 *   - Exponential backoff on 429 / 502 / 503 responses
 */
export function useSubmissionStatus(
    submissionId: string | null
): UseSubmissionStatusResult {
    const [submission, setSubmission] = useState<SubmissionPayload | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs to survive across renders without triggering re-renders
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentIntervalMs = useRef(BASE_INTERVAL_MS);
    const isMountedRef = useRef(true);

    // ── Core fetch logic ──────────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        if (!submissionId) return;

        try {
            const { data } = await apiClient.get<SubmissionPayload>(
                `/submissions/${submissionId}`
            );

            if (!isMountedRef.current) return;

            // Reset backoff on successful response
            currentIntervalMs.current = BASE_INTERVAL_MS;

            if (TERMINAL_STATES.has(data.status)) {
                // ── Terminal: commit final payload and halt ──────────────
                setSubmission(data);
                setIsPolling(false);
                setError(null);
                if (intervalRef.current !== null) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } else {
                // ── Transient (PEND / RUN): keep polling ────────────────
                setSubmission(data);
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err?.response?.status;

            if (status === 429 || status === 502 || status === 503) {
                // ── Exponential backoff ─────────────────────────────────
                if (intervalRef.current !== null) {
                    clearInterval(intervalRef.current);
                }

                currentIntervalMs.current = Math.min(
                    currentIntervalMs.current * BACKOFF_MULTIPLIER,
                    MAX_INTERVAL_MS
                );

                intervalRef.current = setInterval(fetchStatus, currentIntervalMs.current);
            } else {
                // ── Unexpected error: surface it and stop ───────────────
                setError(
                    err?.response?.data?.error || err?.message || "Polling failed."
                );
                setIsPolling(false);
                if (intervalRef.current !== null) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        }
    }, [submissionId]);

    // ── Polling lifecycle ─────────────────────────────────────────────

    useEffect(() => {
        isMountedRef.current = true;

        if (!submissionId) {
            setIsPolling(false);
            return;
        }

        // Begin polling
        setIsPolling(true);
        setError(null);
        setSubmission(null);
        currentIntervalMs.current = BASE_INTERVAL_MS;

        // Fire immediately, then schedule interval
        fetchStatus();
        intervalRef.current = setInterval(fetchStatus, BASE_INTERVAL_MS);

        return () => {
            // ── Cleanup: prevent ghost polls ──────────────────────────
            isMountedRef.current = false;
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [submissionId, fetchStatus]);

    // ── Page Visibility API (background tab recovery) ─────────────────

    useEffect(() => {
        if (!submissionId || !isPolling) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // Tab regained focus — force an immediate fetch to bypass throttling
                fetchStatus();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [submissionId, isPolling, fetchStatus]);

    return { submission, isPolling, error };
}
