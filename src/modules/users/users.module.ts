import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EmployeePrismaService } from '../../database/employee-prisma.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [UsersService, EmployeePrismaService],
  controllers: [UsersController],
  exports: [UsersService, EmployeePrismaService],
})
export class UsersModule {}
