import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { MailService } from '../../common/services/mail.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TenantController],
  providers: [TenantService, MailService],
  exports: [TenantService],
})
export class TenantModule {}
