/**
 * Kafka Topics - Centralized topic naming
 * 
 * IMPORTANT: These topics MUST be pre-created by infrastructure team
 * Application will NOT auto-create topics (vendor-safe approach)
 * 
 * Naming convention: module.action_description (snake_case)
 */
export const KAFKA_TOPICS = {
  ATTENDANCE: {
    DASHBOARD_UPDATE: 'attendance.dashboard_update',
    CLOCK_IN: 'attendance.clock_in',
    CLOCK_OUT: 'attendance.clock_out',
    LATE_ARRIVAL: 'attendance.late_arrival',
    EARLY_LEAVE: 'attendance.early_leave',
  },
} as const;

/**
 * Get all topics as array for validation
 */
export function getAllKafkaTopics(): string[] {
  return Object.values(KAFKA_TOPICS.ATTENDANCE);
}
