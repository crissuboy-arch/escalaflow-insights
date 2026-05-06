import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface DemoUser { id: string; email: string; }
interface AuthCtx {
  user: DemoUser | null;
  loading: boolean;
  signIn: (email: string) => void;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = "escalaflow_demo_user";
const Ctx = createContext<AuthCtx>({ user: null, loading: true, signIn: () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const signIn = (email: string) => {
    const u = { id: "demo-user", email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  };
  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
