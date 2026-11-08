import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from "react";
import { me, logout, type Role } from "@/lib/auth.functions";

interface AuthContextValue {
  isAdmin: boolean;
  role: Role | null;
  username: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await me();
      setIsAdmin(!!r.admin);
      setRole(r.role);
      setUsername(r.username);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    await logout();
    setIsAdmin(false);
    setRole(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAdmin, role, username, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
