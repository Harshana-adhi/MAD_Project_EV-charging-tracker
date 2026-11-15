import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setAuthToken, setUnauthorizedHandler } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { getToken, setToken as persistToken, clearToken } from '@/lib/tokenStorage';
import { USE_MOCKS } from '@/lib/config';
import type { Role, User } from '@/types/domain';
import * as real from './api';
import * as mock from './api.mock';

const api = USE_MOCKS ? mock : real;

type AuthState = {
  user: User | null;
  role: Role | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: 'customer' | 'owner') => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function applySession(nextToken: string, nextUser: User) {
    setAuthToken(nextToken);
    await persistToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    if (!USE_MOCKS) connectSocket(nextToken);
  }

  async function clearSession() {
    setAuthToken(null);
    await clearToken();
    setToken(null);
    setUser(null);
    disconnectSocket();
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });

    // Keeps the branded preloader on screen briefly even when session resolution is instant.
    const MIN_PRELOADER_MS = 1600;
    const startedAt = Date.now();

    (async () => {
      const storedToken = await getToken();
      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const me = USE_MOCKS
            ? await mock.getMe(storedToken)
            : await real.getMe();
          setToken(storedToken);
          setUser(me);
          if (!USE_MOCKS) connectSocket(storedToken);
        } catch {
          await clearSession();
        }
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_PRELOADER_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_PRELOADER_MS - elapsed));
      }
      setLoading(false);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const result = await api.signIn({ email, password });
    await applySession(result.token, result.user);
  }

  async function signUp(email: string, password: string, fullName: string, role: 'customer' | 'owner') {
    const result = await api.signUp({ email, password, fullName, role });
    await applySession(result.token, result.user);
  }

  async function signOut() {
    await clearSession();
  }

  return (
    <AuthContext.Provider
      value={{ user, role: user?.role ?? null, token, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
