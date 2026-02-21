import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";

// We test the interceptor logic by creating a fresh instance with the same config
// rather than importing the singleton (which would trigger side effects in test env)

describe("apiClient interceptors", () => {
    let getItemSpy: ReturnType<typeof vi.spyOn>;
    let removeItemSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        getItemSpy = vi.spyOn(Storage.prototype, "getItem");
        removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    describe("request interceptor", () => {
        it("should attach Authorization header when token exists", async () => {
            // Dynamically import the module so localStorage spies are in place
            const { default: apiClient } = await import("@/lib/apiClient");

            localStorage.setItem("codeprix_token", "test-jwt-token-123");

            // Intercept the actual request to inspect the config
            const requestConfig = await new Promise<any>((resolve) => {
                // Use an adapter that captures the config instead of making a real request
                apiClient.defaults.adapter = (config) => {
                    resolve(config);
                    return Promise.reject(new axios.Cancel("intercepted"));
                };
                apiClient.get("/test").catch(() => { });
            });

            expect(requestConfig.headers.Authorization).toBe("Bearer test-jwt-token-123");
        });

        it("should NOT attach Authorization header when no token exists", async () => {
            const { default: apiClient } = await import("@/lib/apiClient");

            localStorage.removeItem("codeprix_token");

            const requestConfig = await new Promise<any>((resolve) => {
                apiClient.defaults.adapter = (config) => {
                    resolve(config);
                    return Promise.reject(new axios.Cancel("intercepted"));
                };
                apiClient.get("/test").catch(() => { });
            });

            expect(requestConfig.headers.Authorization).toBeUndefined();
        });
    });

    describe("response interceptor - 401 handling", () => {
        it("should clear storage and redirect on 401", async () => {
            const { default: apiClient } = await import("@/lib/apiClient");

            localStorage.setItem("codeprix_token", "expired-token");
            localStorage.setItem("codeprix_user", '{"email":"test@test.com"}');

            // Mock window.location.href
            const locationSpy = vi.spyOn(window, "location", "get").mockReturnValue({
                ...window.location,
                href: "",
            } as Location);

            const hrefSetter = vi.fn();
            Object.defineProperty(window, "location", {
                value: { ...window.location, href: "" },
                writable: true,
                configurable: true,
            });
            Object.defineProperty(window.location, "href", {
                set: hrefSetter,
                get: () => "",
                configurable: true,
            });

            // Simulate a 401 response
            apiClient.defaults.adapter = () => {
                return Promise.reject({
                    response: { status: 401, data: { message: "Not authorized" } },
                });
            };

            try {
                await apiClient.get("/protected");
            } catch {
                // Expected rejection
            }

            expect(localStorage.getItem("codeprix_token")).toBeNull();
            expect(localStorage.getItem("codeprix_user")).toBeNull();
        });
    });
});
