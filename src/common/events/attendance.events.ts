import { RABBITMQ_QUEUES } from '../constants/rabbitmq-queues';

/**
 * Event constants for attendance module
 * Using centralized RabbitMQ queue names
 */
export const ATTENDANCE_EVENTS = RABBITMQ_QUEUES.ATTENDANCE;

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
