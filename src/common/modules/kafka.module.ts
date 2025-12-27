import { Module, Global } from '@nestjs/common';
import { KafkaProducerService } from '../services/kafka-producer.service';
import { KafkaAdminService } from '../services/kafka-admin.service';

@Global()
@Module({
  providers: [KafkaAdminService, KafkaProducerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
