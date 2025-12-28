import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { KAFKA_TOPICS } from '../constants/kafka-topics';

/**
 * KafkaAdminService - Vendor-friendly approach
 * 
 * Assumes:
 * - Topics are pre-created by infrastructure team
 * - No admin privileges for topic creation
 * - Only verifies topic existence
 * - Fails fast if required topics don't exist
 */
@Injectable()
export class KafkaAdminService implements OnModuleInit {
  private readonly logger = new Logger(KafkaAdminService.name);
  private kafka: Kafka;
  
  // Required topics that MUST exist before app starts
  private readonly REQUIRED_TOPICS = [
    KAFKA_TOPICS.ATTENDANCE.DASHBOARD_UPDATE,
  ];

  constructor(private readonly config: ConfigService) {
    const broker = this.config.get<string>('KAFKA_BROKER') || 'localhost:9093';
    
    this.kafka = new Kafka({
      clientId: 'hr-app-admin',
      brokers: [broker],
      retry: {
        retries: 3,
        initialRetryTime: 1000,
        maxRetryTime: 30000,
      },
    });
  }

  async onModuleInit() {
    const admin = this.kafka.admin();

    try {
      await admin.connect();
      this.logger.log('✓ Kafka Admin connected');

      // Verify topics exist (DO NOT CREATE)
      const existingTopics = await admin.listTopics();
      
      const missingTopics = this.REQUIRED_TOPICS.filter(
        topic => !existingTopics.includes(topic)
      );

      if (missingTopics.length > 0) {
        this.logger.warn(
          `⚠ Missing Kafka topics: ${missingTopics.join(', ')}`
        );
        this.logger.warn(
          '→ Please create these topics via your infrastructure team or Kafka admin'
        );
        this.logger.warn(
          '→ Application will continue but Kafka features may not work'
        );
      } else {
        this.logger.log(
          `✓ All required topics verified: ${this.REQUIRED_TOPICS.join(', ')}`
        );
      }
      
    } catch (err) {
      this.logger.error('✗ Failed to verify Kafka topics', err.message);
      this.logger.warn('→ Kafka may not be available');
    } finally {
      await admin.disconnect();
    }
  }
}
