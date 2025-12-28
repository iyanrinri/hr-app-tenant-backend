import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

/**
 * RabbitMQProducerService - Production-grade implementation
 * 
 * Features:
 * - Graceful error handling
 * - Connection retry logic
 * - Degrade gracefully if RabbitMQ unavailable
 */
@Injectable()
export class RabbitMQProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQProducerService.name);
  private client: ClientProxy;
  private isConnected = false;
  private maxRetries = 3;
  private retryDelay = 3000;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');

    if (!url) {
      this.logger.warn('⚠ RABBITMQ_URL is not defined - RabbitMQ disabled');
      return;
    }

    this.logger.log(`Connecting to RabbitMQ: ${url}`);
    await this.connectWithRetry();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      const url = this.config.get<string>('RABBITMQ_URL');

      this.client = ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [url],
          queue: 'hr_app_queue',
          queueOptions: {
            durable: true,
          },
        },
      } as any);

      await this.client.connect();
      this.isConnected = true;
      this.logger.log('✓ RabbitMQ producer connected');
    } catch (error) {
      this.logger.error(
        `✗ Failed to connect RabbitMQ producer (attempt ${attempt}/${this.maxRetries})`,
        error.message
      );

      if (attempt < this.maxRetries) {
        this.logger.log(`→ Retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(attempt + 1);
      } else {
        this.logger.warn('→ RabbitMQ producer unavailable - events will be logged only');
        this.isConnected = false;
      }
    }
  }

  async onModuleDestroy() {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
        this.logger.log('✓ RabbitMQ producer disconnected');
      } catch (error) {
        this.logger.error('Error disconnecting RabbitMQ producer', error.message);
      }
    }
  }

  /**
   * Emit event to RabbitMQ queue
   * Gracefully degrades if RabbitMQ unavailable
   */
  emit(pattern: string, data: any): void {
    if (!this.isConnected || !this.client) {
      this.logger.warn(`⚠ RabbitMQ unavailable - event not sent: ${pattern}`);
      return;
    }

    try {
      this.client.emit(pattern, data);
      this.logger.log(`✓ Event emitted -> ${pattern}`);
    } catch (error) {
      this.logger.error(`✗ Failed to emit event to ${pattern}`, error.message);
    }
  }

  /**
   * Check if RabbitMQ producer is ready
   */
  isReady(): boolean {
    return this.isConnected;
  }
}
