/**
 * RabbitMQ Queue Names - Centralized queue/exchange naming
 * 
 * RabbitMQ uses queues instead of topics
 * Naming convention: module.action_description (snake_case)
 */
export const RABBITMQ_QUEUES = {
  ATTENDANCE: {
    DASHBOARD_UPDATE: 'attendance.dashboard_update',
    CLOCK_IN: 'attendance.clock_in',
    CLOCK_OUT: 'attendance.clock_out',
    LATE_ARRIVAL: 'attendance.late_arrival',
    EARLY_LEAVE: 'attendance.early_leave',
  },
} as const;

/**
 * Get all queues as array
 */
export function getAllRabbitMQQueues(): string[] {
  return Object.values(RABBITMQ_QUEUES.ATTENDANCE);
}
