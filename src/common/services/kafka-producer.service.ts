import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ClientKafka, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KafkaProducerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaProducerService.name);
  private client: ClientKafka;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const broker = this.config.get<string>('KAFKA_BROKER');

    if (!broker) {
      throw new Error('KAFKA_BROKER is not defined');
    }

    this.logger.log(`Kafka broker used: ${broker}`);

    this.client = ClientProxyFactory.create({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'hr-app-producer',
          brokers: [broker],
        },
      },
    }) as ClientKafka;

    await this.client.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
      this.logger.log('Kafka producer disconnected');
    }
  }

  emit(topic: string, payload: any) {
    this.client.emit(topic, {
      key: topic,
      value: payload,
    });

    this.logger.log(`Emit event -> ${topic}`);
  }
}
