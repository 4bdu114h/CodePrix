import axios from "axios";

/**
 * Singleton Axios instance configured to route through the Vite proxy.
 *
 * - Base URL `/api/proxy` is rewritten by Vite to `http://localhost:8000/api`
 * - Request interceptor auto-attaches JWT from localStorage
 * - Response interceptor handles 401 (zombie token) by clearing auth and redirecting
 */
const apiClient = axios.create({
    baseURL: "/api/proxy",
    headers: {
        "Content-Type": "application/json",
    },
});

// ── Request Interceptor: Token Hydration ────────────────────────────
apiClient.interceptors.request.use(
    (config) => {
        // Defensive SSR guard (not strictly needed for Vite SPA, but future-proof)
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("codeprix_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: Zombie Token Killer ───────────────────────
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Step 1: Destroy the dead token
            if (typeof window !== "undefined") {
                localStorage.removeItem("codeprix_token");
                localStorage.removeItem("codeprix_user");

                // Step 2 & 3: Cancel promise chain + hard redirect to login
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
