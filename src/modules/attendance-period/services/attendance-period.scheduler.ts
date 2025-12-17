import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AttendancePeriodPrismaService } from '../../../database/attendance-period-prisma.service';

@Injectable()
export class AttendancePeriodScheduler implements OnModuleInit {
  private readonly logger = new Logger(AttendancePeriodScheduler.name);

  constructor(private attendancePeriodPrisma: AttendancePeriodPrismaService) {}

  async onModuleInit() {
    this.logger.log('🚀 AttendancePeriodScheduler initialized');
  }

  // Manual method to run the transition check (accepts tenantSlug now)
  async runPeriodsCheck(tenantSlug?: string) {
    this.logger.log('🎛️  Running manual periods transition check...');
    if (tenantSlug) {
      const result = await this.checkPeriodTransitionsForTenant(tenantSlug);
      this.logger.log('✅ Manual check completed');
      return {
        ...result,
        timestamp: new Date(),
      };
    }
    
    return {
      message: 'No tenant specified for manual check',
      timestamp: new Date(),
    };
  }

  private async checkPeriodTransitionsForTenant(tenantSlug: string) {
    this.logger.log(`🔄 Checking for attendance period transitions in tenant: ${tenantSlug}...`);
    
    try {
      const client = this.attendancePeriodPrisma.getClient(tenantSlug);
      const now = new Date().toISOString();
      
      // Find and deactivate periods that should not be active
      const deactivateQuery = `
        UPDATE "attendance_period"
        SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "isActive" = true AND ("endDate" < '${now}'::timestamp OR "startDate" > '${now}'::timestamp)
        RETURNING *
      `;
      
      const deactivatedPeriods = await client.$queryRawUnsafe(deactivateQuery);

      // Find and activate periods that should be active
      const activateQuery = `
        UPDATE "attendance_period"
        SET "isActive" = true, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "isActive" = false AND "startDate" <= '${now}'::timestamp AND "endDate" >= '${now}'::timestamp
        RETURNING *
      `;
      
      const activatedPeriods = await client.$queryRawUnsafe(activateQuery);

      const deactivatedCount = (deactivatedPeriods as any[])?.length || 0;
      const activatedCount = (activatedPeriods as any[])?.length || 0;

      this.logger.log(`➖ Deactivated ${deactivatedCount} periods`);
      this.logger.log(`➕ Activated ${activatedCount} periods`);

      return {
        deactivated: deactivatedCount,
        activated: activatedCount,
        message: 'Period transition check completed',
      };

    } catch (error) {
      this.logger.error('❌ Error during period transitions:', error);
      throw error;
    }
  }

  // Get statistics about period status for a tenant
  async getPeriodStatusStats(tenantSlug: string) {
    try {
      const client = this.attendancePeriodPrisma.getClient(tenantSlug);
      const now = new Date().toISOString();
      
      const statsQuery = `
        SELECT
          SUM(CASE WHEN "isActive" = true THEN 1 ELSE 0 END) as total_active,
          SUM(CASE WHEN "isActive" = false THEN 1 ELSE 0 END) as total_inactive,
          SUM(CASE WHEN "isActive" = true AND "startDate" <= '${now}'::timestamp AND "endDate" >= '${now}'::timestamp THEN 1 ELSE 0 END) as currently_valid_active,
          SUM(CASE WHEN "isActive" = true AND "endDate" < '${now}'::timestamp THEN 1 ELSE 0 END) as expired_but_active,
          SUM(CASE WHEN "isActive" = true AND "startDate" > '${now}'::timestamp THEN 1 ELSE 0 END) as upcoming_but_active,
          SUM(CASE WHEN "isActive" = false AND "startDate" <= '${now}'::timestamp AND "endDate" >= '${now}'::timestamp THEN 1 ELSE 0 END) as should_be_active_but_inactive
        FROM "attendance_period"
      `;

      const result = await client.$queryRawUnsafe(statsQuery);
      const stats = (result as any[])[0];

      return {
        totalActive: Number(stats.total_active || 0),
        totalInactive: Number(stats.total_inactive || 0),
        currentlyValidActive: Number(stats.currently_valid_active || 0),
        expiredButStillActive: Number(stats.expired_but_active || 0),
        upcomingButIncorrectlyActive: Number(stats.upcoming_but_active || 0),
        shouldBeActiveButInactive: Number(stats.should_be_active_but_inactive || 0),
        lastChecked: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Error getting period stats:', error);
      throw error;
    }
  }
}