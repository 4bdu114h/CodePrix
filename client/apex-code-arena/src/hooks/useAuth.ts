import { useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";

export interface AuthUser {
  email: string;
  name?: string;
  id?: string;
}

interface JwtPayload {
  id: string;
  role?: string;
  iat?: number;
  exp?: number;
}

const TOKEN_KEY = "codeprix_token";
const USER_KEY = "codeprix_user";

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Derive admin status from a JWT string
  const deriveAdmin = (jwt: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(jwt);
      return decoded.role === "admin";
    } catch {
      return false;
    }
  };

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAdmin(deriveAdmin(storedToken));
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((jwtToken: string, userData: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, jwtToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    setIsAdmin(deriveAdmin(jwtToken));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setIsAdmin(false);
  }, []);

  return { user, token, isAdmin, isLoading, login, logout };
};
