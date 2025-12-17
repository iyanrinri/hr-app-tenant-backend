/**
 * @deprecated This repository is no longer used.
 * The AttendancePeriodService now uses raw SQL queries via AttendancePeriodPrismaService
 * for multi-tenant support with dynamic database connections.
 * 
 * All database operations for attendance periods are now handled directly in the service:
 * - src/modules/attendance-period/services/attendance-period.service.ts
 * - src/database/attendance-period-prisma.service.ts
 */

// This file is kept for reference only and should not be imported anywhere
export class AttendancePeriodRepository {
  // Deprecated - use AttendancePeriodService instead
}