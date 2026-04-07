import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface RankEntry {
    user: {
        _id: string;
        email: string;
        name: string;
    };
    score: number;
    latestAC: string | null;
    problemsSolvedIds: string[];
}

const SOCKET_URL =
    import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

/**
 * Custom hook for real-time leaderboard data via Socket.IO.
 *
 * - Connects to the main backend server (shared HTTP + WS on same port)
 * - Joins the contest-specific room on connect
 * - Replaces local state entirely on each update (no incremental merge)
 * - Stale-packet rejection: drops payloads with timestamp <= last rendered
 * - Cleans up on unmount to prevent ghost connections
 */
export const useLeaderboardSocket = (contestId: string) => {
    const [rankList, setRankList] = useState<RankEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const lastTimestampRef = useRef<number>(0);

    useEffect(() => {
        if (!contestId) return;

        // Initialize TCP handshake
        const socket: Socket = io(SOCKET_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        // Connection established
        socket.on("connect", () => {
            setIsConnected(true);
            // Subscribe to the contest-specific room
            socket.emit("join-contest", contestId);
        });

        // Core listener — overwrite local state with authoritative server state
        // Stale-packet rejection: only accept if timestamp is newer
        socket.on(
            "leaderboard-update",
            (data: { rank_list: RankEntry[]; timestamp: number }) => {
                if (data.timestamp > lastTimestampRef.current) {
                    lastTimestampRef.current = data.timestamp;
                    setRankList(data.rank_list);
                }
                // Otherwise silently drop the stale packet
            }
        );

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        // Strict cleanup: sever connection on component unmount
        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
            lastTimestampRef.current = 0;
        };
    }, [contestId]); // Re-run if user switches to a different contest

    return { rankList, isConnected };
};
