import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, tokens } from "./api";

export type User = { id: number; username: string; email: string; full_name: string; phone: string; role: "customer" | "seller" | "admin"; mfa_enabled: boolean; store_name: string };
type LoginResult = { mfa?: { challengeId: string; partialToken: string }; user?: User };

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  verifyOtp: (challengeId: string, partialToken: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokens.access) { setUser(null); return; }
    try { setUser(await api<User>("/api/auth/me")); } catch { tokens.clear(); setUser(null); }
  }, []);

  useEffect(() => { refreshUser().finally(() => setLoading(false)); }, [refreshUser]);

  const login: AuthState["login"] = async (username, password) => {
    const data = await api("/api/auth/login", { body: { username, password }, auth: false });
    if (data.mfa_required) return { mfa: { challengeId: data.challenge_id, partialToken: data.partial_token } };
    tokens.set(data.access_token, data.refresh_token);
    setUser(data.user);
    return { user: data.user };
  };

  const verifyOtp: AuthState["verifyOtp"] = async (challengeId, partialToken, code) => {
    const data = await api("/api/auth/verify-otp", { body: { challenge_id: challengeId, code }, token: partialToken });
    tokens.set(data.access_token, data.refresh_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    tokens.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, verifyOtp, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
