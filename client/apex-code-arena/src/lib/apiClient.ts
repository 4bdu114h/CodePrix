import axios from "axios";

/**
 * Singleton Axios instance configured for both development and production.
 *
 * - Dev:  Base URL `/api/proxy` is rewritten by Vite to `http://localhost:8000/api`
 * - Prod: Base URL is set via `VITE_API_URL` environment variable
 * - Request interceptor auto-attaches JWT from localStorage
 * - Response interceptor handles 401 (zombie token) and 429 (rate limit)
 */
const baseURL =
    import.meta.env.MODE === "production"
        ? import.meta.env.VITE_API_URL
        : "/api/proxy";

const apiClient = axios.create({
    baseURL,
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

// ── Response Interceptor: Zombie Token Killer + Rate Limit Handler ──
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 401) {
            // Destroy the dead token
            if (typeof window !== "undefined") {
                localStorage.removeItem("codeprix_token");
                localStorage.removeItem("codeprix_user");
                window.location.href = "/login";
            }
        }

        if (status === 429) {
            // Fire a custom event so any UI toast system can pick it up
            if (typeof window !== "undefined") {
                const message =
                    error.response?.data?.error ||
                    "Too many requests. Please slow down.";
                window.dispatchEvent(
                    new CustomEvent("rate-limited", { detail: { message } })
                );
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
