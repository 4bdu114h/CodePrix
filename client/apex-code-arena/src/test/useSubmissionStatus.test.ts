import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSubmissionStatus } from "@/hooks/useSubmissionStatus";
import type { SubmissionPayload } from "@/hooks/useSubmissionStatus";

// ── Mock apiClient ──────────────────────────────────────────────────
vi.mock("@/lib/apiClient", () => ({
    default: {
        get: vi.fn(),
    },
}));

import apiClient from "@/lib/apiClient";
const mockedGet = vi.mocked(apiClient.get);

// ── Helpers ─────────────────────────────────────────────────────────

function makePayload(
    overrides: Partial<SubmissionPayload> = {}
): SubmissionPayload {
    return {
        _id: "sub_test_123",
        status: "PEND",
        metrics: { time: 0, memory: 0 },
        failedTestCase: null,
        logs: { stdout: "", stderr: "" },
        ...overrides,
    };
}

/** Utility: wait for a specified number of milliseconds (real time) */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("useSubmissionStatus", () => {
    beforeEach(() => {
        mockedGet.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── 1. Dormant when submissionId is null ───────────────────────

    it("should remain dormant when submissionId is null", () => {
        const { result } = renderHook(() => useSubmissionStatus(null));

        expect(result.current.isPolling).toBe(false);
        expect(result.current.submission).toBeNull();
        expect(result.current.error).toBeNull();
        expect(mockedGet).not.toHaveBeenCalled();
    });

    // ── 2. Fires immediate fetch and commits terminal state ───────

    it("should poll and halt on AC terminal state", async () => {
        // First call: PEND (the immediate fetch), second call: AC (after interval)
        mockedGet
            .mockResolvedValueOnce({ data: makePayload({ status: "PEND" }) })
            .mockResolvedValueOnce({
                data: makePayload({
                    status: "AC",
                    metrics: { time: 45, memory: 12800 },
                }),
            });

        const { result } = renderHook(() =>
            useSubmissionStatus("sub_test_123")
        );

        // Wait for the immediate fetch to complete
        await waitFor(() => {
            expect(result.current.submission?.status).toBe("PEND");
        });

        expect(result.current.isPolling).toBe(true);

        // Wait for the interval to fire and return AC
        await waitFor(
            () => {
                expect(result.current.submission?.status).toBe("AC");
            },
            { timeout: 3000 }
        );

        expect(result.current.isPolling).toBe(false);
        expect(result.current.submission?.metrics.time).toBe(45);
        expect(result.current.submission?.metrics.memory).toBe(12800);
    });

    // ── 3. Commits WA with failedTestCase ─────────────────────────

    it("should commit WA status with failedTestCase", async () => {
        mockedGet.mockResolvedValueOnce({
            data: makePayload({ status: "WA", failedTestCase: 3 }),
        });

        const { result } = renderHook(() =>
            useSubmissionStatus("sub_wa_456")
        );

        await waitFor(() => {
            expect(result.current.submission?.status).toBe("WA");
        });

        expect(result.current.isPolling).toBe(false);
        expect(result.current.submission?.failedTestCase).toBe(3);
    });

    // ── 4. Handles CE with stderr logs ────────────────────────────

    it("should commit CE status with stderr logs", async () => {
        mockedGet.mockResolvedValueOnce({
            data: makePayload({
                status: "CE",
                logs: { stdout: "", stderr: "error: expected ';' before '}'" },
            }),
        });

        const { result } = renderHook(() =>
            useSubmissionStatus("sub_ce_789")
        );

        await waitFor(() => {
            expect(result.current.submission?.status).toBe("CE");
        });

        expect(result.current.isPolling).toBe(false);
        expect(result.current.submission?.logs.stderr).toContain("expected ';'");
    });

    // ── 5. Cleans up interval on unmount (memory leak prevention) ─

    it("should clear interval on unmount to prevent memory leaks", async () => {
        const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

        mockedGet.mockResolvedValue({ data: makePayload({ status: "PEND" }) });

        const { result, unmount } = renderHook(() =>
            useSubmissionStatus("sub_leak_test")
        );

        // Wait for at least one poll
        await waitFor(() => {
            expect(mockedGet).toHaveBeenCalledTimes(1);
        });

        expect(result.current.isPolling).toBe(true);

        unmount();

        // clearInterval must have been called during cleanup
        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    // ── 6. Surfaces unexpected errors ─────────────────────────────

    it("should set error state on unexpected network failure", async () => {
        mockedGet.mockRejectedValueOnce({
            response: { status: 500, data: { error: "Server down" } },
        });

        const { result } = renderHook(() =>
            useSubmissionStatus("sub_error_test")
        );

        await waitFor(() => {
            expect(result.current.error).toBe("Server down");
        });

        expect(result.current.isPolling).toBe(false);
    });
});
