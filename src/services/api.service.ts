import axios, { type AxiosInstance, type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api.config';
import { storage } from '../utils/storage';
import { timeHeaders } from '../utils/dateUtils';
import type { UserRole, OTPResponse, LoginResponse, ApiResponse, GatePassRequest } from '../types';

// ── Axios Instance ────────────────────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request Interceptor ───────────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const session = storage.getSession();
  const deviceId = storage.getDeviceId();
  const th = timeHeaders();

  if (session?.token) {
    config.headers.set('Authorization', `Bearer ${session.token}`);
  }
  config.headers.set('X-Device-Id', deviceId);
  config.headers.set('X-Client-Time', th['X-Client-Time']);
  config.headers.set('X-Client-Timezone', th['X-Client-Timezone']);

  return config;
});

// ── Response Interceptor (401 → logout) ───────────────────────────────────────
let logoutHandler: (() => void) | null = null;

export function setLogoutHandler(fn: () => void) {
  logoutHandler = fn;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/');

    if (status === 401 && !isAuthRequest) {
      storage.clearAll();
      logoutHandler?.();
    }

    // Retry on 5xx / network errors (timeouts, cold-start 502/503). 4xx are
    // client errors (auth, not-found) and fail fast — no point retrying them.
    const config = error.config as (InternalAxiosRequestConfig & { _retryCount?: number }) | undefined;
    const isRetryable = status >= 500 || !error.response;

    if (config && isRetryable && (config._retryCount ?? 0) < API_CONFIG.RETRY_ATTEMPTS) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      // Exponential backoff (capped) so retries span a cold-start window
      // instead of giving up after one quick attempt.
      const backoff = Math.min(
        API_CONFIG.RETRY_DELAY * 2 ** (config._retryCount - 1),
        API_CONFIG.RETRY_MAX_DELAY,
      );
      await new Promise((r) => setTimeout(r, backoff));
      return api(config);
    }

    return Promise.reject(error);
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeBoolean(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return ['true', '1', 'yes'].includes(v.toLowerCase());
  if (typeof v === 'number') return v === 1;
  return false;
}

function normalizeUser(user: Record<string, unknown>): Record<string, unknown> {
  if (!user) return user;
  const n = { ...user };
  if ('isActive' in n) n.isActive = normalizeBoolean(n.isActive);
  if ('is_active' in n) n.is_active = normalizeBoolean(n.is_active);
  if ('enabled' in n) n.enabled = normalizeBoolean(n.enabled);
  return n;
}

function normalizeToken(token: unknown): string | undefined {
  if (typeof token !== 'string') return undefined;
  const trimmed = token.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^Bearer\s+/i, '');
}

function findTokenDeep(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[_-]/g, '');
    if (
      normalizedKey === 'token' ||
      normalizedKey === 'jwt' ||
      normalizedKey === 'accesstoken' ||
      normalizedKey === 'authtoken' ||
      normalizedKey === 'bearertoken' ||
      normalizedKey === 'jwttoken' ||
      normalizedKey === 'idtoken'
    ) {
      const token = normalizeToken(nestedValue);
      if (token) return token;
    }

    const nestedToken = findTokenDeep(nestedValue);
    if (nestedToken) return nestedToken;
  }

  return undefined;
}

function extractAuthToken(data: Record<string, any>, headers?: AxiosResponse['headers']): string | undefined {
  const headerToken =
    normalizeToken((headers as any)?.authorization) ||
    normalizeToken((headers as any)?.Authorization) ||
    normalizeToken((headers as any)?.get?.('authorization')) ||
    normalizeToken((headers as any)?.get?.('Authorization'));

  return headerToken || findTokenDeep(data);
}

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, string> | undefined;
    return data?.message || data?.error || data?.errorMessage || error.message || 'Something went wrong';
  }
  return (error as Error)?.message || 'Something went wrong';
}

// ── Wake-up Ping ──────────────────────────────────────────────────────────────
export function wakeUpBackend(): Promise<boolean> {
  return api
    .get('/health', { timeout: 90000 })
    .then(() => true)
    .catch(() => false);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendOTP(userId: string, role: UserRole): Promise<OTPResponse> {
  try {
    switch (role) {
      case 'STUDENT':
        return (await api.post('/auth/student/send-otp', { regNo: userId })).data;
      case 'STAFF':
      case 'NON_TEACHING':
      case 'NON_CLASS_INCHARGE':
      case 'ADMIN_OFFICER':
        return (await api.post('/auth/staff/send-otp', { staffCode: userId })).data;
      case 'HOD':
        return (await api.post('/auth/hod/send-otp', { hodCode: userId })).data;
      case 'HR':
        return (await api.post('/auth/hr/send-otp', { hrCode: userId })).data;
      case 'SECURITY':
        return (await api.post('/auth/login/security-id', { securityId: userId })).data;
      default:
        return { success: false, message: 'Unknown role' };
    }
  } catch (e) {
    return { success: false, message: extractError(e) };
  }
}

export async function verifyOTP(userId: string, otp: string, role: UserRole): Promise<LoginResponse> {
  try {
    let data: Record<string, any>;
    let response: AxiosResponse;
    switch (role) {
      case 'STUDENT':
        response = await api.post('/auth/student/verify-otp', { regNo: userId, otp });
        data = response.data;
        return { success: data.success, message: data.message, user: normalizeUser(data.student) as any, role: 'STUDENT', token: extractAuthToken(data, response.headers) };
      case 'STAFF':
      case 'NON_TEACHING':
      case 'NON_CLASS_INCHARGE':
      case 'ADMIN_OFFICER':
        response = await api.post('/auth/staff/verify-otp', { staffCode: userId, otp });
        data = response.data;
        return { success: data.success, message: data.message, user: normalizeUser(data.staff) as any, role, token: extractAuthToken(data, response.headers) };
      case 'HOD':
        response = await api.post('/auth/hod/verify-otp', { hodCode: userId, otp });
        data = response.data;
        return { success: data.success, message: data.message, user: normalizeUser(data.hod) as any, role: 'HOD', token: extractAuthToken(data, response.headers) };
      case 'HR':
        response = await api.post('/auth/hr/verify-otp', { hrCode: userId, otp });
        data = response.data;
        return { success: data.success, message: data.message, user: normalizeUser(data.hr) as any, role: 'HR', token: extractAuthToken(data, response.headers) };
      case 'SECURITY':
        response = await api.post('/auth/verify-otp', { securityId: userId, otp });
        data = response.data;
        return { success: data.success, message: data.message, user: normalizeUser(data.security) as any, role: 'SECURITY', token: extractAuthToken(data, response.headers) };
      default:
        return { success: false, message: 'Unknown role' };
    }
  } catch (e) {
    return { success: false, message: extractError(e) };
  }
}

export async function detectRole(staffCode: string): Promise<UserRole> {
  try {
    const { data } = await api.get(`/auth/detect-role/${encodeURIComponent(staffCode)}`);
    if (data.success && data.role) return data.role as UserRole;
  } catch {}
  return 'STAFF';
}

/**
 * The login response carries no photo — /api/profile-photo/{code} is the only
 * source, resolving a regNo/staffCode against student → staff → HR. Returns
 * null when the endpoint is unreachable or the person has no photo on file.
 */
export async function getProfilePhoto(code: string): Promise<string | null> {
  if (!code) return null;
  try {
    const { data } = await api.get(`/profile-photo/${encodeURIComponent(code)}`);
    return data?.success ? (data.photoUrl ?? null) : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE PASS — STUDENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function submitStudentGatePass(d: { regNo: string; purpose: string; reason: string; requestDate: string; attachmentUri?: string }): Promise<ApiResponse> {
  try { return (await api.post('/gate-pass/student/submit', d)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getStudentGatePassRequests(regNo: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/student/${regNo}`);
    return { success: true, requests: data.requests || [] };
  } catch (e) { return { success: false, requests: [] }; }
}

export async function getGatePassQRCode(requestId: number, identifier: string): Promise<{ success: boolean; qrCode?: string; manualCode?: string; qrExpiresAt?: string; message?: string }> {
  try {
    const { data } = await api.get(`/gate-pass/qr-code/${requestId}?identifier=${encodeURIComponent(identifier)}`);
    return { success: data.success, qrCode: data.qrCode, manualCode: data.manualCode, qrExpiresAt: data.qrExpiresAt };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getUserEntryHistory(userId: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/entry-exit/history/${userId}`);
    return data.data || data.history || [];
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE PASS — STAFF
// ═══════════════════════════════════════════════════════════════════════════════

export async function submitStaffGatePass(d: { staffCode: string; purpose: string; reason: string; requestDate: string; attachmentUri?: string }): Promise<ApiResponse> {
  try { return (await api.post('/gate-pass/staff/submit', d)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function submitNTFGatePass(d: { staffCode: string; purpose: string; reason: string; requestDate: string; attachmentUri?: string }): Promise<ApiResponse> {
  try { return (await api.post('/gate-pass/ntf/submit', d)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function submitNCIGatePass(d: { staffCode: string; purpose: string; reason: string; requestDate: string; designation?: string }): Promise<ApiResponse> {
  try { return (await api.post('/gate-pass/non-class-incharge/submit', d)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getStaffPendingRequests(staffCode: string): Promise<ApiResponse<GatePassRequest[]>> {
  try { return (await api.get(`/gate-pass/staff/${staffCode}/pending`)).data; }
  catch (e) { return { success: false, message: extractError(e), data: [] }; }
}

export async function getStaffAllRequests(staffCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/staff/${staffCode}/all`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getStaffOwnRequests(staffCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/staff/${staffCode}/own`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getNTFOwnRequests(staffCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/staff/${staffCode}/own`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getNCIOwnRequests(staffCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/non-class-incharge/${staffCode}/own`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function approveGatePassByStaff(staffCode: string, requestId: number, remark?: string): Promise<ApiResponse> {
  try { return (await api.post(`/gate-pass/staff/${staffCode}/approve/${requestId}`, { remark })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectGatePassByStaff(staffCode: string, requestId: number, reason: string): Promise<ApiResponse> {
  try { return (await api.post(`/gate-pass/staff/${staffCode}/reject/${requestId}`, { reason })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getStaffPendingAll(staffCode: string): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get(`/gate-pass/staff/${staffCode}/pending-all`);
    return { success: true, data: data.requests || data.data || [] };
  } catch { return { success: false, data: [] }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE PASS — HOD
// ═══════════════════════════════════════════════════════════════════════════════

export async function getHODPendingRequests(hodCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/hod/${hodCode}/pending`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getHODAllRequests(hodCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/gate-pass/hod/${hodCode}/all`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function approveGatePassByHOD(hodCode: string, requestId: number, remark?: string): Promise<ApiResponse> {
  try { return (await api.post(`/gate-pass/hod/${hodCode}/approve/${requestId}`, { remark })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectGatePassByHOD(hodCode: string, requestId: number, reason: string): Promise<ApiResponse> {
  try { return (await api.post(`/gate-pass/hod/${hodCode}/reject/${requestId}`, { reason })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function submitHODGatePass(hodCode: string, purpose: string, reason: string, attachmentUri?: string): Promise<ApiResponse> {
  try {
    const { data } = await api.post('/hod/gate-pass/submit', { hodCode, purpose, reason, attachmentUri });
    return { success: data.status === 'SUCCESS' || data.success !== false, message: data.message };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getHODMyRequests(hodCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/hod/gate-pass/my-requests?hodCode=${encodeURIComponent(hodCode)}`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getHODGatePassQRCode(requestId: number, hodCode: string): Promise<{ success: boolean; qrCode?: string; manualCode?: string; message?: string }> {
  try {
    const { data } = await api.get(`/hod/gate-pass/${requestId}/qr-code?hodCode=${encodeURIComponent(hodCode)}`);
    return { success: true, qrCode: data.qrCode, manualCode: data.manualCode };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getHODDepartmentStudents(hodCode: string): Promise<{ success: boolean; students: any[] }> {
  try {
    const { data } = await api.get(`/hod/${hodCode}/department/students`);
    return { success: true, students: data.students || [] };
  } catch { return { success: false, students: [] }; }
}

export async function getHODDepartmentStaff(hodCode: string): Promise<{ success: boolean; staff: any[] }> {
  try {
    const { data } = await api.get(`/hod/${hodCode}/department/staff`);
    const raw = data.staff || [];
    const staff = raw.map((s: any) => ({
      ...s,
      staffName:
        s.staffName ||
        s.name ||
        (s.firstName && s.lastName ? `${s.firstName} ${s.lastName}`.trim() : null) ||
        s.firstName ||
        s.lastName ||
        s.fullName ||
        '',
    }));
    return { success: true, staff };
  } catch { return { success: false, staff: [] }; }
}

export async function getHODVisitorRequests(hodCode: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/hod/visitor-requests?hodCode=${encodeURIComponent(hodCode)}`);
    return data.requests || [];
  } catch { return []; }
}

export async function approveVisitorByHOD(visitorId: number, hodCode: string): Promise<ApiResponse> {
  try { return (await api.post(`/hod/visitor-requests/${visitorId}/approve`, { hodCode })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectVisitorByHOD(visitorId: number, reason: string): Promise<ApiResponse> {
  try { return (await api.post(`/hod/visitor-requests/${visitorId}/reject`, { reason })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HR
// ═══════════════════════════════════════════════════════════════════════════════

export async function getHRPendingRequests(hrCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/hr/gate-pass/pending?hrCode=${encodeURIComponent(hrCode)}`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getHRAllRequests(hrCode: string): Promise<{ success: boolean; requests: GatePassRequest[] }> {
  try {
    const { data } = await api.get(`/hr/gate-pass/all?hrCode=${encodeURIComponent(hrCode)}`);
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function approveGatePassByHR(hrCode: string, requestId: number): Promise<ApiResponse> {
  try {
    const { data } = await api.post(`/hr/gate-pass/${requestId}/approve`, { hrCode });
    const ok = data.success === true || data.status === 'SUCCESS';
    return { success: ok, message: data.message };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectGatePassByHR(hrCode: string, requestId: number, reason: string): Promise<ApiResponse> {
  try { return (await api.post(`/hr/gate-pass/${requestId}/reject`, { hrCode, reason })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getHRPendingBulkPasses(): Promise<{ success: boolean; requests: any[] }> {
  try {
    const { data } = await api.get('/hr/bulk-pass/pending');
    return { success: true, requests: data.requests || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function approveHODBulkPass(requestId: number, hrCode: string): Promise<ApiResponse> {
  try { return (await api.post(`/hr/bulk-pass/${requestId}/approve`, { hrCode })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectHODBulkPass(requestId: number, hrCode: string, reason: string): Promise<ApiResponse> {
  try { return (await api.post(`/hr/bulk-pass/${requestId}/reject`, { hrCode, reason })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getHRVisitorRequests(hrCode: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/hr/visitor-requests?hrCode=${encodeURIComponent(hrCode)}`);
    return data.requests || [];
  } catch { return []; }
}

export async function approveVisitorByHR(visitorId: number, hrCode: string): Promise<ApiResponse> {
  try { return (await api.post(`/hr/visitor-requests/${visitorId}/approve`, { hrCode })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectVisitorByHR(visitorId: number, reason: string): Promise<ApiResponse> {
  try { return (await api.post(`/hr/visitor-requests/${visitorId}/reject`, { reason })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getGateLogs(fromDate?: string, toDate?: string): Promise<{ success: boolean; logs: any[] }> {
  try {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const { data } = await api.get(`/hr/gate-logs?${params}`);
    return { success: true, logs: data.logs || [] };
  } catch { return { success: false, logs: [] }; }
}

export async function getAdminGateLogs(fromDate?: string, toDate?: string): Promise<{ success: boolean; logs: any[] }> {
  try {
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    const { data } = await api.get(`/hr/admin/gate-logs?${params}`);
    return { success: true, logs: data.logs || [] };
  } catch { return { success: false, logs: [] }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK PASS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createBulkGatePass(payload: any): Promise<ApiResponse> {
  try { return (await api.post('/bulk-pass/create', payload)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function submitHODBulkPass(payload: any): Promise<ApiResponse> {
  try { return (await api.post('/hod/bulk-pass/create', payload)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getStudentsByStaffDepartment(staffCode: string): Promise<{ success: boolean; students: any[] }> {
  try {
    const { data } = await api.get(`/bulk-pass/students/${staffCode}`);
    const raw = data.students || data.data || [];
    const students = raw.map((s: any) => ({ ...s, fullName: s.fullName || s.studentName || s.name || '' }));
    return { success: true, students };
  } catch { return { success: false, students: [] }; }
}

export async function getStaffBulkPassRequests(staffCode: string): Promise<{ success: boolean; requests: any[] }> {
  try {
    const { data } = await api.get(`/staff/${staffCode}/bulk-pass/requests`);
    return { success: true, requests: data.requests || data.data || [] };
  } catch { return { success: false, requests: [] }; }
}

export async function getBulkGatePassDetails(requestId: number): Promise<any> {
  try { return (await api.get(`/bulk-pass/details/${requestId}`)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getHODBulkPassRequests(hodCode: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/hod/${hodCode}/bulk-pass/requests`);
    return data.requests || [];
  } catch { return []; }
}

export async function getHODBulkPassDetails(requestId: number): Promise<any> {
  try { return (await api.get(`/hod/bulk-pass/details/${requestId}`)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

export async function scanQRCode(qrData: string, securityId: string): Promise<ApiResponse> {
  try { return (await api.post('/security/scan', { qrCode: qrData, securityId })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function scanLateEntry(idCode: string, securityId: string): Promise<ApiResponse> {
  try { return (await api.post('/security/scan-late-entry', { idCode, securityId })).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function manualExit(personName: string, scannedBy?: string, userId?: string, scanId?: number, purpose?: string): Promise<ApiResponse> {
  try {
    const { data } = await api.post('/security/manual-exit', { personName, scannedBy, userId, scanId, purpose });
    const ok = data.success === true || data.status === 'SUCCESS';
    return { ...data, success: ok };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getSecurityStats(): Promise<{ success: boolean; data?: any }> {
  try {
    const { data } = await api.get('/security/stats');
    return { success: true, data };
  } catch (e) { return { success: false }; }
}

export async function getActivePersons(): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get('/security/active-persons');
    return { success: true, data: data.persons || data.data || [] };
  } catch { return { success: false, data: [] }; }
}

export async function getScanHistory(): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get('/security/scan-history');
    return { success: true, data: data.scans || data.data || data.history || [] };
  } catch { return { success: false, data: [] }; }
}

export async function getRecentScans(): Promise<any[]> {
  try {
    const { data } = await api.get('/security/recent-scans');
    return data.scans || data.entries || [];
  } catch { return []; }
}

export async function getEscalatedVisitors(): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get('/security/escalated-visitors');
    return { success: true, data: data.visitors || data.data || (Array.isArray(data) ? data : []) };
  } catch { return { success: false, data: [] }; }
}

export async function approveEscalatedVisitor(visitorId: number | string, securityId: string): Promise<ApiResponse> {
  try {
    const { data } = await api.post(`/security/escalated-visitors/${visitorId}/approve`, { securityId });
    if (data && (data.success === true || data.id != null || data.status === 'APPROVED')) {
      return { success: true, message: 'Visitor approved successfully' };
    }
    return { success: false, message: data?.message || 'Failed' };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectEscalatedVisitor(visitorId: number | string, securityId: string, reason: string): Promise<ApiResponse> {
  try {
    const { data } = await api.post(`/security/escalated-visitors/${visitorId}/reject`, { securityId, reason });
    if (data !== null && data !== undefined) {
      const isError = typeof data === 'object' && data.success === false;
      if (!isError) return { success: true, message: 'Visitor rejected' };
    }
    return { success: false, message: data?.message || 'Failed' };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function registerVisitor(d: {
  name: string; phone: string; email: string; numberOfPeople: number;
  role?: 'VISITOR' | 'VENDOR'; departmentId: string; staffCode: string;
  purpose: string; vehicleNumber?: string; vehicleType?: string; securityId: string;
  visitorPhoto?: string;
}): Promise<ApiResponse> {
  try {
    // Backend reads the image from `photoUrl` as a data URI (see Visitor.photoUrl).
    const { visitorPhoto, ...rest } = d;
    const payload = visitorPhoto ? { ...rest, photoUrl: visitorPhoto } : rest;
    return (await api.post('/security/register-visitor', payload)).data;
  }
  catch (e) { return { success: false, message: extractError(e) }; }
}

// ── Vehicles ──────────────────────────────────────────────────────────────────
export async function getVehicles(): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get('/security/vehicles');
    return { success: true, data: data.vehicles || data.data || [] };
  } catch { return { success: false, data: [] }; }
}

export async function searchVehicle(licensePlate: string): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get(`/security/vehicles/search?licensePlate=${encodeURIComponent(licensePlate)}`);
    return { success: true, data: data.vehicles || data.data || [] };
  } catch { return { success: false, data: [] }; }
}

export async function registerVehicle(payload: any): Promise<ApiResponse> {
  try { return (await api.post('/security/vehicles', payload)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

// ── Security Visitor Requests ────────────────────────────────────────────────
export async function getVisitorRequestsForSecurity(securityId: string): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get(`/security/visitor-requests?securityId=${securityId}`);
    return { success: true, data: data.requests || data.data || [] };
  } catch { return { success: false, data: [] }; }
}

// ── HOD Contacts ──────────────────────────────────────────────────────────────
export async function getHODContacts(): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get('/security/hods');
    return { success: true, data: Array.isArray(data) ? data : (data.data || data.hods || []) };
  } catch { return { success: false, data: [] }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISITORS (STAFF SIDE)
// ═══════════════════════════════════════════════════════════════════════════════

export async function createInstantGuestPass(d: {
  name: string; email: string; phone: string; department: string;
  staffCode: string; purpose: string; numberOfPeople?: number;
  vehicleNumber?: string; creatorStaffCode: string; creatorRole: string;
  visitorPhoto?: string;
}): Promise<{ success: boolean; id?: number; qrCode?: string; manualCode?: string; message?: string }> {
  try {
    // Backend (InstantGuestRequest.photoUrl) requires the photo as a
    // `data:image/...;base64,` URI and validates the MIME type + size.
    const { visitorPhoto, ...rest } = d;
    const payload = visitorPhoto ? { ...rest, photoUrl: visitorPhoto } : rest;
    const { data } = await api.post('/unified-visitors/instant-guest', payload);
    if (data.success === false) return { success: false, message: data.message };
    return { success: true, id: data.id, qrCode: data.qrCode, manualCode: data.manualCode, message: data.message };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getVisitorRequestsForStaff(staffCode: string): Promise<{ success: boolean; requests: any[] }> {
  try {
    const { data } = await api.get(`/visitors/staff/${staffCode}/requests`);
    return { success: true, requests: Array.isArray(data) ? data : (data.requests || []) };
  } catch { return { success: false, requests: [] }; }
}

export async function approveVisitorRequest(visitorId: number, approvedBy: string): Promise<ApiResponse> {
  try {
    const { data } = await api.post(`/visitors/${visitorId}/approve?approvedBy=${encodeURIComponent(approvedBy)}`);
    return { success: data.success !== false, message: data.message || 'Approved' };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function rejectVisitorRequest(visitorId: number, reason: string): Promise<ApiResponse> {
  try {
    const { data } = await api.post(`/visitors/${visitorId}/reject`, { reason });
    return { success: data.success !== false, message: data.message || 'Rejected' };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTMENTS & DIRECTORY
// ═══════════════════════════════════════════════════════════════════════════════

export async function getDepartments(): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get('/departments');
    return { success: true, data: data.departments || data.data || (Array.isArray(data) ? data : []) };
  } catch { return { success: false, data: [] }; }
}

export async function getStaffByDepartment(deptCode: string): Promise<{ success: boolean; data: any[] }> {
  try {
    const { data } = await api.get(`/departments/${encodeURIComponent(deptCode)}/staff-list`);
    return { success: true, data: data.staff || data.data || [] };
  } catch { return { success: false, data: [] }; }
}

export async function getStaffDirectory(): Promise<any[]> {
  try {
    const { data } = await api.get('/staff/directory');
    return data.staff || data || [];
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getNotifications(userId: string, role: string): Promise<any[]> {
  try {
    const { data } = await api.get(`/notifications/${role.toLowerCase()}/${userId}`);
    return data.notifications || data || [];
  } catch { return []; }
}

export async function markNotificationRead(notificationId: number): Promise<ApiResponse> {
  try { return (await api.put(`/notifications/${notificationId}/read`)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function markAllNotificationsRead(userId: string): Promise<ApiResponse> {
  try { return (await api.put(`/notifications/${userId}/read-all`)).data; }
  catch (e) { return { success: false, message: extractError(e) }; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getStaffEvents(staffCode: string): Promise<{ success: boolean; events: any[] }> {
  try {
    const { data } = await api.get(`/events/coordinator/${encodeURIComponent(staffCode)}`);
    return { success: true, events: data.events || data.data || (Array.isArray(data) ? data : []) };
  } catch { return { success: false, events: [] }; }
}

export async function uploadEventCsvPreview(eventId: number, staffCode: string, file: File): Promise<{ success: boolean; rows?: any[]; message?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('staffCode', staffCode);
    const { data } = await api.post(`/events/${eventId}/csv/preview`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { success: true, rows: data.rows || data.data || [] };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function confirmEventCsvUpload(eventId: number, staffCode: string, rows: any[]): Promise<ApiResponse> {
  try {
    const { data } = await api.post(`/events/${eventId}/csv/confirm`, { staffCode, rows });
    return { success: data?.success !== false, message: data?.message, ...data };
  }
  catch (e) { return { success: false, message: extractError(e) }; }
}

export async function getEventPasses(eventId: number): Promise<{ success: boolean; passes: any[]; message?: string }> {
  try {
    const { data } = await api.get(`/events/${eventId}/passes`);
    return { success: true, passes: data.passes || data.data || [] };
  } catch (e) { return { success: false, passes: [], message: extractError(e) }; }
}

export interface SingleEventPassInput {
  fullName: string;
  email: string;
  collegeName: string;
  phone: string;
  studentId?: string;
  department?: string;
  course?: string;
}

export async function addSingleEventPass(eventId: number, staffCode: string, row: SingleEventPassInput): Promise<{ success: boolean; pass?: any; message?: string }> {
  try {
    const { data } = await api.post(`/events/${eventId}/passes`, { staffCode, ...row });
    return { success: data?.status !== 'ERROR', pass: data?.pass, message: data?.message };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function deleteEventPass(eventId: number, passId: number, staffCode: string): Promise<ApiResponse> {
  try {
    const { data } = await api.delete(`/events/${eventId}/passes/${passId}`, { params: { staffCode } });
    return { success: data?.status !== 'ERROR', message: data?.message || 'Pre-registration deleted' };
  } catch (e) { return { success: false, message: extractError(e) }; }
}

export async function completeEvent(eventId: number): Promise<ApiResponse> {
  try {
    const { data } = await api.put(`/events/${eventId}/complete`);
    return { success: data?.success !== false, message: data?.message || 'Event completed', ...data };
  }
  catch (e) { return { success: false, message: extractError(e) }; }
}

// ── Entry/Exit status ─────────────────────────────────────────────────────────
export async function getUserStatus(userId: string): Promise<any> {
  try { return (await api.get(`/entry-exit/status/${userId}`)).data; }
  catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SERVICE OBJECT (for components that import { apiService })
// ═══════════════════════════════════════════════════════════════════════════════

export const apiService = {
  getNotifications,
  markAllNotificationsRead,
  getBulkGatePassDetails,
  approveRequestAsHR: (requestId: number, hrCode: string) => approveGatePassByHR(hrCode, requestId),
  rejectRequestAsHR: (requestId: number, hrCode: string, reason: string) => rejectGatePassByHR(hrCode, requestId, reason),
  getHODMyGatePassRequests: getHODMyRequests,
  getHODGatePassQRCode,
};

export default api;
