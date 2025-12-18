// Event constants for attendance module
export const ATTENDANCE_EVENTS = {
  CLOCK_IN: 'attendance.clock-in',
  CLOCK_OUT: 'attendance.clock-out',
  DASHBOARD_UPDATE: 'attendance.dashboard-update',
  LATE_ARRIVAL: 'attendance.late-arrival',
  EARLY_LEAVE: 'attendance.early-leave',
} as const;

// Event payload interfaces
export interface AttendanceClockInEvent {
  tenantSlug: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  status: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface AttendanceClockOutEvent {
  tenantSlug: string;
  employeeId: string;
  employeeName: string;
  checkIn: string;
  checkOut: string;
  workDuration: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface AttendanceDashboardUpdateEvent {
  tenantSlug: string;
  date: string;
  summary: {
    totalEmployees: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    attendanceRate: number;
    lateRate: number;
    onTimeRate: number;
  };
  presentEmployees: any[];
  absentEmployees: any[];
  lateEmployees: any[];
}
