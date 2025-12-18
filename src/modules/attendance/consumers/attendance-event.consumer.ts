import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { ATTENDANCE_EVENTS } from '../../../common/events/attendance.events';
import { AttendanceGateway } from '../../../common/gateways/attendance.gateway';

@Controller()
export class AttendanceEventConsumer {
  private readonly logger = new Logger(AttendanceEventConsumer.name);

  constructor(private readonly attendanceGateway: AttendanceGateway) {}

  /**
   * Consume dashboard update events from Kafka and emit to WebSocket
   */
  @EventPattern(ATTENDANCE_EVENTS.DASHBOARD_UPDATE)
  async handleDashboardUpdate(
    @Payload() data: any,
    @Ctx() context: KafkaContext,
  ) {
    try {
      const { tenantSlug } = data;
      
      this.logger.log(`[Kafka Consumer] 📥 Dashboard update received for tenant: ${tenantSlug}`);
      this.logger.log(`[Kafka Consumer] 📊 Data summary:`, {
        presentCount: data.presentEmployees?.length || 0,
        absentCount: data.absentEmployees?.length || 0,
        lateCount: data.lateEmployees?.length || 0,
      });
      
      // Log Kafka message details
      const { offset } = context.getMessage();
      const partition = context.getPartition();
      const topic = context.getTopic();
      
      this.logger.log(
        `[Kafka Consumer] 📨 Message details - Topic: ${topic}, Partition: ${partition}, Offset: ${offset}`,
      );
      
      // Emit to WebSocket clients
      this.logger.log(`[Kafka Consumer] 🔄 Forwarding to WebSocket gateway...`);
      this.attendanceGateway.emitDashboardUpdate(tenantSlug, data);
      this.logger.log(`[Kafka Consumer] ✅ Successfully forwarded to WebSocket`);
    } catch (error) {
      this.logger.error('[Kafka Consumer] ❌ Error processing dashboard update event:', error);
    }
  }
}
