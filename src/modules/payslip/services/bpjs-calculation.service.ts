import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { SettingCategory } from '@/modules/settings/dto/create-setting.dto';


export interface BPJSCalculationResult {
  // BPJS Kesehatan
  bpjsKesehatanEmployee: number;
  bpjsKesehatanCompany: number;
  bpjsKesehatanTotal: number;

  // BPJS Ketenagakerjaan breakdown
  jhtEmployee: number; // Jaminan Hari Tua (employee)
  jhtCompany: number; // Jaminan Hari Tua (company)
  jpEmployee: number; // Jaminan Pensiun (employee)
  jpCompany: number; // Jaminan Pensiun (company)
  jkkCompany: number; // Jaminan Kecelakaan Kerja (company only)
  jkmCompany: number; // Jaminan Kematian (company only)

  // Totals
  bpjsKetenagakerjaanEmployee: number;
  bpjsKetenagakerjaanCompany: number;
  bpjsKetenagakerjaanTotal: number;

  // Grand totals
  totalEmployeeDeduction: number;
  totalCompanyContribution: number;
  totalBPJS: number;

  // Calculation details
  grossSalaryUsed: number;
  kesehatanMaxSalaryCap: number;
  jpMaxSalaryCap: number;
  jkkRiskCategory: string;
}

export interface BPJSConfig {
  // BPJS Kesehatan
  kesehatanEmployeeRate: number;
  kesehatanCompanyRate: number;
  kesehatanMaxSalary: number;

  // BPJS Ketenagakerjaan
  jhtEmployeeRate: number;
  jhtCompanyRate: number;
  jpEmployeeRate: number;
  jpCompanyRate: number;
  jpMaxSalary: number;
  jkkRate: number;
  jkmCompanyRate: number;
}

@Injectable()
export class BPJSCalculationService {
  constructor(private readonly prisma: MultiTenantPrismaService) {}

  /**
   * Calculate BPJS Kesehatan & Ketenagakerjaan contributions
   * 
   * BPJS Kesehatan:
   * - Employee: 1% (max 12 juta)
   * - Company: 4% (max 12 juta)
   * 
   * BPJS Ketenagakerjaan:
   * - JHT Employee: 2%
   * - JHT Company: 3.7%
   * - JP Employee: 1% (max ~9.5 juta)
   * - JP Company: 2% (max ~9.5 juta)
   * - JKK Company: 0.24% - 1.74% (varies by risk)
   * - JKM Company: 0.3%
   */
  async calculateBPJS(
    tenantSlug: string,
    monthlyGrossSalary: number,
    jkkRiskCategory: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW',
  ): Promise<BPJSCalculationResult> {
    const config = await this.getBPJSConfig(tenantSlug);

    // === BPJS KESEHATAN ===
    const kesehatanBaseSalary = Math.min(
      monthlyGrossSalary,
      config.kesehatanMaxSalary,
    );

    const bpjsKesehatanEmployee = Math.round(
      kesehatanBaseSalary * config.kesehatanEmployeeRate,
    );
    const bpjsKesehatanCompany = Math.round(
      kesehatanBaseSalary * config.kesehatanCompanyRate,
    );
    const bpjsKesehatanTotal =
      bpjsKesehatanEmployee + bpjsKesehatanCompany;

    // === BPJS KETENAGAKERJAAN ===

    // JHT (Jaminan Hari Tua) - no cap
    const jhtEmployee = Math.round(
      monthlyGrossSalary * config.jhtEmployeeRate,
    );
    const jhtCompany = Math.round(monthlyGrossSalary * config.jhtCompanyRate);

    // JP (Jaminan Pensiun) - capped salary
    const jpBaseSalary = Math.min(monthlyGrossSalary, config.jpMaxSalary);
    const jpEmployee = Math.round(jpBaseSalary * config.jpEmployeeRate);
    const jpCompany = Math.round(jpBaseSalary * config.jpCompanyRate);

    // JKK (Jaminan Kecelakaan Kerja) - company only, varies by risk
    const jkkCompany = Math.round(monthlyGrossSalary * config.jkkRate);

    // JKM (Jaminan Kematian) - company only
    const jkmCompany = Math.round(monthlyGrossSalary * config.jkmCompanyRate);

    // Calculate totals
    const bpjsKetenagakerjaanEmployee = jhtEmployee + jpEmployee;
    const bpjsKetenagakerjaanCompany =
      jhtCompany + jpCompany + jkkCompany + jkmCompany;
    const bpjsKetenagakerjaanTotal =
      bpjsKetenagakerjaanEmployee + bpjsKetenagakerjaanCompany;

    const totalEmployeeDeduction =
      bpjsKesehatanEmployee + bpjsKetenagakerjaanEmployee;
    const totalCompanyContribution =
      bpjsKesehatanCompany + bpjsKetenagakerjaanCompany;
    const totalBPJS = totalEmployeeDeduction + totalCompanyContribution;

    return {
      bpjsKesehatanEmployee,
      bpjsKesehatanCompany,
      bpjsKesehatanTotal,
      jhtEmployee,
      jhtCompany,
      jpEmployee,
      jpCompany,
      jkkCompany,
      jkmCompany,
      bpjsKetenagakerjaanEmployee,
      bpjsKetenagakerjaanCompany,
      bpjsKetenagakerjaanTotal,
      totalEmployeeDeduction,
      totalCompanyContribution,
      totalBPJS,
      grossSalaryUsed: monthlyGrossSalary,
      kesehatanMaxSalaryCap: config.kesehatanMaxSalary,
      jpMaxSalaryCap: config.jpMaxSalary,
      jkkRiskCategory,
    };
  }

  /**
   * Get BPJS configuration from Settings table
   */
  private async getBPJSConfig(tenantSlug: string): Promise<BPJSConfig> {
    const settings = await this.prisma.getClient(tenantSlug).setting.findMany({
      where: {
        OR: [
          { category: SettingCategory.BPJS_KESEHATAN },
          { category: SettingCategory.BPJS_KETENAGAKERJAAN },
        ],
      },
    });

    const config: any = {};

    settings.forEach((setting: any) => {
      switch (setting.key) {
        // BPJS Kesehatan
        case 'BPJS_KESEHATAN_EMPLOYEE_RATE':
          config.kesehatanEmployeeRate = parseFloat(setting.value);
          break;
        case 'BPJS_KESEHATAN_COMPANY_RATE':
          config.kesehatanCompanyRate = parseFloat(setting.value);
          break;
        case 'BPJS_KESEHATAN_MAX_SALARY':
          config.kesehatanMaxSalary = parseFloat(setting.value);
          break;

        // BPJS Ketenagakerjaan - JHT
        case 'BPJS_TK_JHT_EMPLOYEE_RATE':
          config.jhtEmployeeRate = parseFloat(setting.value);
          break;
        case 'BPJS_TK_JHT_COMPANY_RATE':
          config.jhtCompanyRate = parseFloat(setting.value);
          break;

        // BPJS Ketenagakerjaan - JP
        case 'BPJS_TK_JP_EMPLOYEE_RATE':
          config.jpEmployeeRate = parseFloat(setting.value);
          break;
        case 'BPJS_TK_JP_COMPANY_RATE':
          config.jpCompanyRate = parseFloat(setting.value);
          break;
        case 'BPJS_TK_JP_MAX_SALARY':
          config.jpMaxSalary = parseFloat(setting.value);
          break;

        // BPJS Ketenagakerjaan - JKK (default to LOW risk)
        case 'BPJS_TK_JKK_DEFAULT_RATE':
          config.jkkRate = parseFloat(setting.value);
          break;

        // BPJS Ketenagakerjaan - JKM
        case 'BPJS_TK_JKM_COMPANY_RATE':
          config.jkmCompanyRate = parseFloat(setting.value);
          break;
      }
    });

    return config as BPJSConfig;
  }

  /**
   * Get JKK rate based on risk category
   */
  async getJKKRate(
    tenantSlug: string,
    riskCategory: 'LOW' | 'MEDIUM_LOW' | 'MEDIUM' | 'MEDIUM_HIGH' | 'HIGH',
  ): Promise<number> {
    const keyMap = {
      LOW: 'BPJS_TK_JKK_RATE_LOW',
      MEDIUM_LOW: 'BPJS_TK_JKK_RATE_MEDIUM_LOW',
      MEDIUM: 'BPJS_TK_JKK_RATE_MEDIUM',
      MEDIUM_HIGH: 'BPJS_TK_JKK_RATE_MEDIUM_HIGH',
      HIGH: 'BPJS_TK_JKK_RATE_HIGH',
    };

    const setting = await this.prisma.getClient(tenantSlug).setting.findUnique({
      where: { key: keyMap[riskCategory] },
    });

    return setting ? parseFloat(setting.value) : 0.0024; // Default to LOW
  }
}
