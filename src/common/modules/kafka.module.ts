import { Module, Global } from '@nestjs/common';
import { KafkaProducerService } from '../services/kafka-producer.service';

@Global()
@Module({
  providers: [KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
