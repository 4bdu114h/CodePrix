import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useLeaderboardSocket } from "./useLeaderboardSocket";

const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  removeAllListeners: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

describe("useLeaderboardSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "connect") {
        setTimeout(() => cb(), 0);
      }
      return mockSocket;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not connect when contestLinkCode is empty", async () => {
    const { io } = await import("socket.io-client");
    const { result } = renderHook(() => useLeaderboardSocket(""));

    expect(io).not.toHaveBeenCalled();
    expect(result.current.rankList).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it("connects and emits join-contest when contestLinkCode is provided", async () => {
    const { io } = await import("socket.io-client");
    renderHook(() => useLeaderboardSocket("contest-abc"));

    expect(io).toHaveBeenCalledWith("http://localhost:5001", {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith("join-contest", "contest-abc");
    });

    expect(mockSocket.on).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("leaderboard-update", expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
  });

  it("updates rankList when leaderboard-update is received", async () => {
    let leaderboardUpdateCb: (data: { rank_list: unknown[] }) => void = () => {};
    mockSocket.on.mockImplementation((event: string, cb: (...args: unknown[]) => void) => {
      if (event === "connect") {
        setTimeout(() => cb(), 0);
      }
      if (event === "leaderboard-update") {
        leaderboardUpdateCb = cb as (data: { rank_list: unknown[] }) => void;
      }
      return mockSocket;
    });

    const { result } = renderHook(() => useLeaderboardSocket("contest-abc"));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    const mockRankList = [
      {
        user: { email: "a@test.com", name: "Alice" },
        score: 5,
        latestAC: "2024-01-01T00:00:00Z",
        problemsSolvedIds: ["p1", "p2"],
      },
    ];

    await act(() => {
      leaderboardUpdateCb({ rank_list: mockRankList });
    });

    expect(result.current.rankList).toEqual(mockRankList);
  });

  it("cleans up socket on unmount", async () => {
    const { result, unmount } = renderHook(() => useLeaderboardSocket("contest-abc"));

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    unmount();

    expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
