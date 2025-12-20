import { Module, forwardRef } from '@nestjs/common';
import { SalaryService } from './services/salary.service';
import { SalaryHistoryService } from './services/salary-history.service';
import { SalaryController } from './controllers/salary.controller';
import { SalaryHistoryController } from './controllers/salary-history.controller';
import { SalaryRepository } from './repositories/salary.repository';
import { SalaryHistoryRepository } from './repositories/salary-history.repository';
import { EmployeesModule } from '../employees/employees.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [forwardRef(() => EmployeesModule), DatabaseModule],
  controllers: [SalaryController, SalaryHistoryController],
  providers: [
    SalaryService,
    SalaryHistoryService,
    SalaryRepository,
    SalaryHistoryRepository,
  ],
  exports: [
    SalaryService,
    SalaryHistoryService,
    SalaryRepository,
    SalaryHistoryRepository,
  ],
})
export class SalaryModule {}