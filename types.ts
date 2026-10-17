
export type ShiftType = string;

export type TaskCategory = string;

export interface Task {
  id: string;
  label: string;
  category: TaskCategory;
  isCompleted: boolean;
  notes?: string;
  timestamp?: number;
}

export interface TaskTemplate {
  id: string;
  label: string;
  category: TaskCategory;
  shiftType: ShiftType | 'ALL'; // 'ALL' applies to every shift
}

export interface ShiftData {
  id: string;
  type: ShiftType;
  date: string;
  tasks: Task[];
  status: 'draft' | 'submitted';
  agentName: string;
  occupancy: number; // Mock percentage
  notes: string;
  submittedAt?: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export type UserRole = 'Front Office Manager' | 'Asst. FOM' | 'Senior GSA' | 'GSA' | 'Management' | 'Admin';

export type UserRightKey = 
  // View / Module Rights
  | 'view_dashboard'
  | 'view_guest_requests'
  | 'view_repeater_guests'
  | 'view_checklist'
  | 'view_checklist_history'
  | 'view_reports'
  | 'view_occupancy'
  | 'view_checklist_management'
  | 'view_user_management'
  | 'view_settings'
  // Action Rights
  | 'action_submit_shift'
  | 'action_reopen_shift'
  | 'action_manage_tasks'
  | 'action_edit_occupancy'
  | 'action_manage_requests'
  | 'action_delete_requests'
  | 'action_manage_repeater'
  | 'action_delete_repeater'
  | 'action_manage_rights'
  | 'action_manage_settings'
  | 'action_export_data';

export interface UserRightDefinition {
  key: UserRightKey;
  label: string;
  description: string;
  category: 'Module Access' | 'Shift Operations' | 'Guest Services' | 'Administration';
}

export interface UserRightsConfig {
  rolePermissions: Record<UserRole, UserRightKey[]>;
  userOverrides: Record<string, {
    useCustom: boolean;
    grantedRights: UserRightKey[];
  }>;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  initials: string;
  color: string;
  password?: string;
  isActive?: boolean; // New field to allow disabling users
}

export interface ShiftAssignment {
  id: string;
  date: string; // Format: YYYY-MM-DD
  shiftType: ShiftType;
  userId: string;
}

export interface DailyOccupancy {
  date: string; // YYYY-MM-DD
  percentage: number;
  notes?: string;
  isHighSeason?: boolean;
}

export type LoginFont = 'Inter' | 'Space Grotesk' | 'Righteous' | 'Playfair Display' | 'Montserrat';

export interface AppConfig {
  appName: string;
  logoUrl: string;
  loginBgUrl: string;
  loginFont: LoginFont;
  supportMessage: string;
}

// Guest Request Types
export type RequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
export type RequestPriority = 'Low' | 'Medium' | 'High';

export interface GuestRequest {
  id: string;
  roomNumber: string;
  guestName: string;
  category: string; // e.g., Housekeeping, Maintenance, Amenities, F&B, Transportation
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string; // userId
  loggedBy: string; // Name of the user who entered the request
  remarks?: string; // Optional remarks added during status change
  updatedBy?: string; // Name of user who last updated the status
}

export interface RepeaterGuest {
  id: string;
  guestNames: string[]; // Primary guest + Sharers
  roomNumber: string;
  roomMove?: string;
  visitCount: number;
  lastVisitDate?: string;
  preferences?: string;
  arrivalDate: string;
  departureDate: string;
  status: 'In-House' | 'Expected' | 'Checked-Out' | 'Due-Out';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
