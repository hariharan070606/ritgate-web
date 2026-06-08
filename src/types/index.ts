// ── User Roles ────────────────────────────────────────────────────────────────
export type UserRole = 'STUDENT' | 'STAFF' | 'HOD' | 'HR' | 'SECURITY' | 'NON_TEACHING' | 'NON_CLASS_INCHARGE' | 'ADMIN_OFFICER';

export interface Student {
  id?: number;
  regNo: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  department: string;
  year?: string;
  section?: string;
  currentStatus?: 'INSIDE' | 'OUTSIDE';
  isActive?: boolean;
  profilePhoto?: string;
}

export interface Staff {
  id?: number;
  staffCode: string;
  staffName: string;
  name?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  department: string;
  designation?: string;
  isActive?: boolean;
  profilePhoto?: string;
}

export interface HOD {
  id?: number;
  hodCode: string;
  hodName: string;
  name?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  department: string;
  departments?: string[];
  isActive?: boolean;
  profilePhoto?: string;
}

export interface HR {
  id?: number;
  hrCode: string;
  hrName: string;
  name?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  department: string;
  isActive?: boolean;
  profilePhoto?: string;
}

export interface SecurityPersonnel {
  id?: number;
  securityId: string;
  name: string;
  securityName?: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  shift?: string;
  gateAssignment?: string;
  gateAssigned?: string;
  isActive?: boolean;
  profilePhoto?: string;
}

export type User = Student | Staff | HOD | HR | SecurityPersonnel;

// ── Gate Pass ─────────────────────────────────────────────────────────────────
export type GatePassStatus =
  | 'PENDING'
  | 'PENDING_STAFF'
  | 'PENDING_HOD'
  | 'PENDING_HR'
  | 'APPROVED_BY_STAFF'
  | 'APPROVED_BY_HOD'
  | 'APPROVED'
  | 'REJECTED'
  | 'USED'
  | 'EXITED';

export interface GatePassRequest {
  id?: number;
  regNo?: string;
  staffCode?: string;
  hodCode?: string;
  studentName?: string;
  staffName?: string;
  purpose: string;
  reason: string;
  requestDate: string;
  exitDateTime?: string;
  returnDateTime?: string;
  status: GatePassStatus;
  approvedByStaff?: string;
  approvedByHOD?: string;
  approvedByHR?: string;
  staffRemark?: string;
  hodRemark?: string;
  hrRemark?: string;
  rejectionReason?: string;
  remark?: string;
  qrCode?: string;
  manualCode?: string;
  passType?: 'SINGLE' | 'BULK';
  includeStaff?: boolean;
  studentCount?: number;
  qrOwnerId?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
  attachmentUri?: string;
}

export interface GroupPassRequest {
  id?: number;
  staffCode: string;
  hodCode?: string;
  purpose: string;
  reason: string;
  exitDateTime?: string;
  returnDateTime?: string;
  students: string[];
  staffList?: string[];
  includeStaff?: boolean;
  includeHOD?: boolean;
  qrReceiver?: string;
  status: GatePassStatus;
  qrCode?: string;
  manualCode?: string;
  createdAt?: string;
  participants?: BulkPassParticipant[];
}

export interface BulkPassParticipant {
  id?: string;
  name: string;
  regNo?: string;
  staffCode?: string;
  type: 'STUDENT' | 'STAFF' | 'HOD';
  department?: string;
}

// ── Visitor ───────────────────────────────────────────────────────────────────
export interface Visitor {
  id?: number;
  name: string;
  phone: string;
  email: string;
  role?: 'VISITOR' | 'VENDOR';
  department?: string;
  staffCode?: string;
  personToMeet?: string;
  purpose: string;
  numberOfPeople: number;
  vehicleNumber?: string;
  vehicleType?: string;
  qrCode?: string;
  manualCode?: string;
  status?: string;
  createdAt?: string;
  entryTime?: string;
  exitTime?: string;
}

// ── Vehicle ───────────────────────────────────────────────────────────────────
export interface Vehicle {
  id?: number;
  licensePlate: string;
  ownerName: string;
  ownerPhone: string;
  ownerType: string;
  vehicleType: string;
  vehicleModel?: string;
  vehicleColor?: string;
  status: string;
  createdAt?: string;
  registeredBy?: string;
}

// ── Notification ──────────────────────────────────────────────────────────────
export interface AppNotification {
  id: number;
  userId: string;
  userType: UserRole;
  title: string;
  message: string;
  type: 'GATE_PASS' | 'APPROVAL' | 'REJECTION' | 'BULK_PASS' | 'ENTRY' | 'EXIT' | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
  actionRoute?: string;
}

// ── Active Person ─────────────────────────────────────────────────────────────
export interface ActivePerson {
  id: number;
  name: string;
  type: string;
  purpose: string;
  status: 'PENDING' | 'EXITED';
  inTime: string;
  outTime: string | null;
  qrCode?: string;
  userId?: string;
  department?: string;
  scanId?: number;
}

// ── Scan History ──────────────────────────────────────────────────────────────
export interface ScanHistoryEntry {
  id: number;
  qrCode?: string;
  personName: string;
  personType: string;
  purpose: string;
  status: string;
  scanLocation?: string;
  scannedBy?: string;
  securityId?: string;
  timestamp: string;
  accessGranted?: boolean;
  scanType?: 'ENTRY' | 'EXIT';
}

// ── HOD Contact ───────────────────────────────────────────────────────────────
export interface HODContact {
  id: number;
  name: string;
  department: string;
  email: string;
  phone: string;
  hodCode?: string;
}

// ── Department ────────────────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code?: string;
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  requests?: T[];
  status?: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
  email?: string;
  maskedEmail?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  role?: UserRole;
  token?: string;
}

// ── Gate Log ──────────────────────────────────────────────────────────────────
export interface GateLog {
  id: number;
  personName: string;
  personType: string;
  userId: string;
  department?: string;
  purpose: string;
  scanType: 'ENTRY' | 'EXIT';
  timestamp: string;
  scannedBy?: string;
  gate?: string;
}

// ── Security Stats ────────────────────────────────────────────────────────────
export interface SecurityStats {
  active: number;
  exited: number;
  total: number;
  entries?: number;
}

// ── Session ───────────────────────────────────────────────────────────────────
export interface SessionData {
  token: string;
  user: User;
  role: UserRole;
  deviceId: string;
  loginAt?: number; // epoch ms
}

// ── Toast ─────────────────────────────────────────────────────────────────────
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
