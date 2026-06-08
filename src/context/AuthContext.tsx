import { createContext, useContext, useCallback, useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { setLogoutHandler, verifyOTP, sendOTP, wakeUpBackend } from '../services/api.service';
import type { User, UserRole, SessionData } from '../types';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;   // 8 hours
const WARN_BEFORE_MS = 5 * 60 * 1000;          // warn 5 min before expiry
const CHECK_INTERVAL_MS = 60 * 1000;            // check every minute

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  deviceId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendReady: boolean;
  sessionExpiringSoon: boolean;
  login: (user: User, role: UserRole, token?: string) => void;
  logout: () => void;
  sendOTPRequest: (userId: string, role: UserRole) => Promise<{ success: boolean; message: string; email?: string }>;
  verifyOTPRequest: (userId: string, otp: string, role: UserRole) => Promise<{ success: boolean; message: string; user?: User }>;
  getUserId: () => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false);
  const navigate = useNavigate();
  const deviceId = storage.getDeviceId();
  const logoutRef = useRef<(() => void) | null>(null);

  // ── Auto-login on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const session = storage.getSession();
    if (session?.user && session?.role) {
      // Reject sessions older than TTL immediately on load
      const age = session.loginAt ? Date.now() - session.loginAt : 0;
      if (age > SESSION_TTL_MS) {
        storage.clearAll();
      } else {
        setUser(session.user);
        setRole(session.role);
      }
    }
    setIsLoading(false);
  }, []);

  // ── Wake backend ────────────────────────────────────────────────────────
  useEffect(() => {
    wakeUpBackend().then((ok) => setIsBackendReady(ok));
  }, []);

  // ── Register 401 logout handler ────────────────────────────────────────
  useEffect(() => {
    setLogoutHandler(() => {
      setUser(null);
      setRole(null);
      storage.clearAll();
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  const login = useCallback((u: User, r: UserRole, token?: string) => {
    setUser(u);
    setRole(r);
    setSessionExpiringSoon(false);
    const session: SessionData = { token: token || '', user: u, role: r, deviceId, loginAt: Date.now() };
    storage.setSession(session);
  }, [deviceId]);

  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    setSessionExpiringSoon(false);
    storage.clearAll();
    navigate('/login', { replace: true, state: { expired: false } });
  }, [navigate]);

  // Keep ref current so the interval can call latest logout
  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // ── Proactive token TTL check ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const check = () => {
      const session = storage.getSession();
      if (!session?.loginAt) return;
      const age = Date.now() - session.loginAt;
      if (age >= SESSION_TTL_MS) {
        logoutRef.current?.();
        navigate('/login', { replace: true, state: { expired: true } });
      } else if (age >= SESSION_TTL_MS - WARN_BEFORE_MS) {
        setSessionExpiringSoon(true);
      } else {
        setSessionExpiringSoon(false);
      }
    };
    check(); // run immediately
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user, navigate]);

  const sendOTPRequest = useCallback(async (userId: string, r: UserRole) => {
    return sendOTP(userId, r);
  }, []);

  const verifyOTPRequest = useCallback(async (userId: string, otp: string, r: UserRole) => {
    const result = await verifyOTP(userId, otp, r);
    if (result.success && result.user) {
      login(result.user, r, result.token);
    }
    return result;
  }, [login]);

  const getUserId = useCallback((): string => {
    if (!user || !role) return '';
    switch (role) {
      case 'STUDENT': return (user as any).regNo || '';
      case 'STAFF':
      case 'NON_TEACHING':
      case 'NON_CLASS_INCHARGE':
      case 'ADMIN_OFFICER': return (user as any).staffCode || '';
      case 'HOD': return (user as any).hodCode || '';
      case 'HR': return (user as any).hrCode || '';
      case 'SECURITY': return (user as any).securityId || '';
      default: return '';
    }
  }, [user, role]);

  return (
    <AuthContext.Provider value={{
      user, role, deviceId, isAuthenticated: !!user && !!role,
      isLoading, isBackendReady, sessionExpiringSoon, login, logout,
      sendOTPRequest, verifyOTPRequest, getUserId,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
