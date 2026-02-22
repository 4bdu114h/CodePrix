import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface RankEntry {
    user: {
        email: string;
        name: string;
    };
    score: number;
    latestAC: string | number;
    problemsSolvedIds: string[];
}

const LEADERBOARD_SERVER_URL = "http://localhost:5001";

/**
 * Custom hook for real-time leaderboard data via Socket.IO.
 *
 * - Connects directly to the leaderboard service (not through Vite proxy)
 * - Joins the contest-specific room on connect
 * - Replaces local state entirely on each update (no incremental merge)
 * - Cleans up on unmount to prevent ghost connections
 */
export const useLeaderboardSocket = (contestLinkCode: string) => {
    const [rankList, setRankList] = useState<RankEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!contestLinkCode) return;

        // Initialize TCP handshake — direct to port 5001, bypassing Vite proxy
        const socket: Socket = io(LEADERBOARD_SERVER_URL, {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        // Connection established
        socket.on("connect", () => {
            setIsConnected(true);
            // Subscribe to the contest-specific room
            socket.emit("join-contest", contestLinkCode);
        });

        // Core telemetry listener — overwrite local state with authoritative server state
        socket.on(
            "leaderboard-update",
            (data: { rank_list: RankEntry[]; timestamp: number }) => {
                setRankList(data.rank_list);
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
        };
    }, [contestLinkCode]); // Re-run if user switches to a different contest

    return { rankList, isConnected };
};
