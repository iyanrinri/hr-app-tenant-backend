import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaAdminService implements OnModuleInit {
  private readonly logger = new Logger(KafkaAdminService.name);
  private kafka: Kafka;

  constructor(private readonly config: ConfigService) {
    const broker = this.config.get<string>('KAFKA_BROKER') || 'host.docker.internal:9093';
    
    this.kafka = new Kafka({
      clientId: 'hr-app-admin',
      brokers: [broker],
    });
  }

  async onModuleInit() {
    const admin = this.kafka.admin();

    try {
      await admin.connect();
      this.logger.log('Kafka Admin connected');

      await admin.createTopics({
        waitForLeaders: true,
        topics: [
          {
            topic: 'attendance.dashboard-update',
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
      });

      this.logger.log('✓ Kafka topics ensured');
    } catch (err) {
      this.logger.error('Failed to init Kafka topics', err);
    } finally {
      await admin.disconnect();
      this.logger.log('Kafka Admin disconnected');
    }
  }
}
