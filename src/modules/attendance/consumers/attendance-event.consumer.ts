import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { ATTENDANCE_EVENTS } from '../../../common/events/attendance.events';
import { AttendanceGateway } from '../../../common/gateways/attendance.gateway';

@Controller()
export class AttendanceEventConsumer {
  private readonly logger = new Logger(AttendanceEventConsumer.name);

  constructor(private readonly attendanceGateway: AttendanceGateway) {}

  /**
   * Consume dashboard update events from RabbitMQ and emit to WebSocket
   */
  @EventPattern(ATTENDANCE_EVENTS.DASHBOARD_UPDATE)
  async handleDashboardUpdate(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    try {
      const { tenantSlug } = data;
      
      this.logger.log(`[RabbitMQ Consumer] 📥 Dashboard update received for tenant: ${tenantSlug}`);
      this.logger.log(`[RabbitMQ Consumer] 📊 Data summary:`, {
        presentCount: data.presentEmployees?.length || 0,
        absentCount: data.absentEmployees?.length || 0,
        lateCount: data.lateEmployees?.length || 0,
      });
      
      // Emit to WebSocket clients
      this.logger.log(`[RabbitMQ Consumer] 🔄 Forwarding to WebSocket gateway...`);
      this.attendanceGateway.emitDashboardUpdate(tenantSlug, data);
      this.logger.log(`[RabbitMQ Consumer] ✅ Successfully forwarded to WebSocket`);
      
      // Note: NestJS RabbitMQ handles message acknowledgment automatically
    } catch (error) {
      this.logger.error('[RabbitMQ Consumer] ❌ Error processing dashboard update event:', error);
    }
  }
}
