import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [UsersService, MultiTenantPrismaService],
  controllers: [UsersController],
  exports: [UsersService, MultiTenantPrismaService],
})
export class UsersModule {}
