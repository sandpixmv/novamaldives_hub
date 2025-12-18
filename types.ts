
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
  status: 'active' | 'completed';
  agentName: string;
  occupancy: number; // Mock percentage
  notes: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export type UserRole = 'Front Office Manager' | 'Asst. FOM' | 'Senior GSA' | 'GSA' | 'Management';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  initials: string;
  color: string;
  password?: string;
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

export interface AppConfig {
  appName: string;
  logoUrl: string;
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
