import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PayslipService } from './services/payslip.service';
import { TaxCalculationService } from './services/tax-calculation.service';
import { BPJSCalculationService } from './services/bpjs-calculation.service';
import { PayslipController } from './controllers/payslip.controller';
import { PayslipRepository } from './repositories/payslip.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    PayslipService,
    TaxCalculationService,
    BPJSCalculationService,
    PayslipRepository,
  ],
  controllers: [PayslipController],
  exports: [PayslipService, TaxCalculationService, BPJSCalculationService],
})
export class PayslipModule {}
