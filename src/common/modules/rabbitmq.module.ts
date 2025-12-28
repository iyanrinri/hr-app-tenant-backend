import { Module, Global } from '@nestjs/common';
import { RabbitMQProducerService } from '../services/rabbitmq-producer.service';

@Global()
@Module({
  providers: [RabbitMQProducerService],
  exports: [RabbitMQProducerService],
})
export class RabbitMQModule {}
