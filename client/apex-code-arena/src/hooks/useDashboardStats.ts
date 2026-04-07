import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";

export interface RecentSubmission {
    _id: string;
    problem: {
        _id: string;
        title: string;
        difficulty: "Easy" | "Medium" | "Hard";
    } | null;
    status: string;
    language: string;
    metrics: {
        time: number;
        memory: number;
    };
    createdAt: string;
}

export interface DashboardStats {
    totalSubmissions: number;
    totalAC: number;
    uniqueSolved: number;
    accuracyRate: number;
    recentSubmissions: RecentSubmission[];
}

/**
 * React Query hook for fetching authenticated user's dashboard stats.
 * - Calls GET /api/users/profile/stats (proxied via apiClient)
 * - Auto-attaches JWT from localStorage via interceptor
 * - Stale time: 30s to avoid over-fetching on tab switches
 */
export const useDashboardStats = () => {
    return useQuery<DashboardStats>({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const { data } = await apiClient.get("/users/profile/stats");
            return data.stats;
        },
        staleTime: 30 * 1000,
        retry: 2,
    });
};
