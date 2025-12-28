import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ClientKafka, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

/**
 * KafkaProducerService - Production-grade vendor-friendly implementation
 * 
 * Features:
 * - No auto topic creation (vendor safe)
 * - Graceful error handling
 * - Connection retry logic
 * - Degrade gracefully if Kafka unavailable
 */
@Injectable()
export class KafkaProducerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaProducerService.name);
  private client: ClientKafka;
  private isConnected = false;
  private maxRetries = 3;
  private retryDelay = 3000;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const broker = this.config.get<string>('KAFKA_BROKER');

    if (!broker) {
      this.logger.warn('⚠ KAFKA_BROKER is not defined - Kafka disabled');
      return;
    }

    this.logger.log(`Connecting to Kafka broker: ${broker}`);

    await this.connectWithRetry();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      const broker = this.config.get<string>('KAFKA_BROKER');

      this.client = ClientProxyFactory.create({
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'hr-app-producer',
            brokers: [broker],
            retry: {
              retries: 5,
              initialRetryTime: 300,
              maxRetryTime: 30000,
            },
          },
          producer: {
            allowAutoTopicCreation: false, // VENDOR SAFE: no auto create
            retry: {
              retries: 3,
            },
          },
        },
      } as any) as unknown as ClientKafka;

      await this.client.connect();
      this.isConnected = true;
      this.logger.log('✓ Kafka producer connected');
    } catch (error) {
      this.logger.error(
        `✗ Failed to connect Kafka producer (attempt ${attempt}/${this.maxRetries})`,
        error.message
      );

      if (attempt < this.maxRetries) {
        this.logger.log(`→ Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(attempt + 1);
      } else {
        this.logger.warn('→ Kafka producer unavailable - events will be logged only');
        this.isConnected = false;
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
        this.logger.log('✓ Kafka producer disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting Kafka producer', error.message);
      }
    }
  }

  /**
   * Emit event to Kafka topic
   * Gracefully degrades if Kafka unavailable
   */
  emit(topic: string, payload: any): void {
    if (!this.isConnected || !this.client) {
      this.logger.warn(
        `⚠ Kafka unavailable - event not sent: ${topic}`
      );
      return;
    }

    try {
      this.client.emit(topic, payload);
      this.logger.log(`✓ Event emitted -> ${topic}`);
    } catch (error) {
      this.logger.error(
        `✗ Failed to emit event to ${topic}`,
        error.message
      );
    }
  }

  /**
   * Check if Kafka producer is ready
   */
  isReady(): boolean {
    return this.isConnected;
  }
}
