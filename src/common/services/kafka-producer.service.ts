import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ClientKafka, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private client: ClientKafka;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'hr-app-producer',
          brokers: [process.env.KAFKA_BROKER || 'localhost:9093'],
        },
        producer: {
          allowAutoTopicCreation: true,
        },
      },
    }) as ClientKafka;
  }

  async onModuleInit() {
    await this.client.connect();
    this.logger.log('Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.client.close();
    this.logger.log('Kafka producer disconnected');
  }

  emit(topic: string, payload: any) {
    this.client.emit(topic, {
      key: topic,
      value: payload,
    });

    this.logger.log(`Emit event -> ${topic}`);
  }
}
