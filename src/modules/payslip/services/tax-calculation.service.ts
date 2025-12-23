import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { SettingCategory } from '@/modules/settings/dto/create-setting.dto';

export interface TaxCalculationResult {
  annualGrossSalary: number;
  ptkp: number; // Penghasilan Tidak Kena Pajak
  taxableIncome: number; // PKP - Penghasilan Kena Pajak
  annualTax: number;
  monthlyTax: number;
  taxDetails: {
    bracket: number;
    income: number;
    rate: number;
    tax: number;
  }[];
  ptkpCategory: string;
}

export interface PTKPConfig {
  TK_0: number; // Tidak Kawin, 0 tanggungan
  TK_1: number;
  TK_2: number;
  TK_3: number;
  K_0: number; // Kawin, 0 tanggungan
  K_1: number;
  K_2: number;
  K_3: number;
}

export interface TaxBracket {
  limit: number | null; // null = unlimited (last bracket)
  rate: number;
}

@Injectable()
export class TaxCalculationService {
  constructor(private readonly prisma: MultiTenantPrismaService) {}

  /**
   * Calculate Indonesian PPh 21 (Income Tax) based on progressive brackets
   * 
   * Tax Brackets (2024):
   * - 0 - 60 juta: 5%
   * - 60 - 250 juta: 15%
   * - 250 - 500 juta: 25%
   * - 500 juta - 5 miliar: 30%
   * - > 5 miliar: 35%
   */
  async calculatePPh21(
    tenantSlug: string,
    monthlyGrossSalary: number,
    maritalStatus: 'SINGLE' | 'MARRIED' | null,
    dependents: number = 0,
  ): Promise<TaxCalculationResult> {
    // Get PTKP and Tax Bracket configs from Settings
    const ptkpConfig = await this.getPTKPConfig(tenantSlug);
    const taxBrackets = await this.getTaxBrackets(tenantSlug);

    // Calculate annual gross salary
    const annualGrossSalary = monthlyGrossSalary * 12;

    // Determine PTKP based on marital status and dependents
    const ptkpCategory = this.determinePTKPCategory(maritalStatus, dependents);
    const ptkp = this.getPTKP(ptkpConfig, maritalStatus, dependents);

    // Calculate taxable income (PKP)
    const taxableIncome = Math.max(0, annualGrossSalary - ptkp);

    // Calculate progressive tax
    const { annualTax, taxDetails } = this.calculateProgressiveTax(
      taxableIncome,
      taxBrackets,
    );

    // Monthly tax
    const monthlyTax = Math.round(annualTax / 12);

    return {
      annualGrossSalary,
      ptkp,
      taxableIncome,
      annualTax,
      monthlyTax,
      taxDetails,
      ptkpCategory,
    };
  }

  /**
   * Get PTKP configuration from Settings table
   */
  private async getPTKPConfig(tenantSlug: string): Promise<PTKPConfig> {
    const ptkpSettings = await this.prisma.getClient(tenantSlug).setting.findMany({
      where: {
        category: SettingCategory.TAX_PPH21,
        key: {
          startsWith: 'TAX_PTKP_',
        },
      },
    });

    const config: any = {};
    ptkpSettings.forEach((setting: any) => {
      const key = setting.key.replace('TAX_PTKP_', '');
      config[key] = parseFloat(setting.value);
    });

    return config as PTKPConfig;
  }

  /**
   * Get Tax Brackets configuration from Settings table
   */
  private async getTaxBrackets(tenantSlug: string): Promise<TaxBracket[]> {
    const bracketSettings = await this.prisma.getClient(tenantSlug).setting.findMany({
      where: {
        category: SettingCategory.TAX_PPH21,
        key: {
          startsWith: 'TAX_BRACKET_',
        },
      },
      orderBy: {
        key: 'asc',
      },
    });

    // Parse brackets
    const brackets: TaxBracket[] = [];
    const limits: { [key: number]: number | null } = {};
    const rates: { [key: number]: number } = {};

    bracketSettings.forEach((setting: any) => {
      const match = setting.key.match(/TAX_BRACKET_(\d+)_(LIMIT|RATE)/);
      if (match) {
        const bracketNum = parseInt(match[1]);
        const type = match[2];

        if (type === 'LIMIT') {
          limits[bracketNum] = parseFloat(setting.value);
        } else if (type === 'RATE') {
          rates[bracketNum] = parseFloat(setting.value);
        }
      }
    });

    // Build bracket array
    const maxBracket = Math.max(...Object.keys(limits).map(Number));
    for (let i = 1; i <= maxBracket; i++) {
      brackets.push({
        limit: limits[i] || null,
        rate: rates[i] || 0,
      });
    }

    // Add final bracket (> 5 miliar) if rate exists
    if (rates[maxBracket + 1]) {
      brackets.push({
        limit: null, // unlimited
        rate: rates[maxBracket + 1],
      });
    }

    return brackets;
  }

  /**
   * Determine PTKP category string for display
   */
  private determinePTKPCategory(
    maritalStatus: 'SINGLE' | 'MARRIED' | null,
    dependents: number,
  ): string {
    const status = maritalStatus === 'MARRIED' ? 'K' : 'TK';
    const deps = Math.min(dependents, 3); // Max 3 tanggungan
    return `${status}/${deps}`;
  }

  /**
   * Get PTKP value based on marital status and dependents
   */
  private getPTKP(
    config: PTKPConfig,
    maritalStatus: 'SINGLE' | 'MARRIED' | null,
    dependents: number,
  ): number {
    const status = maritalStatus === 'MARRIED' ? 'K' : 'TK';
    const deps = Math.min(dependents, 3); // Max 3 dependents
    const key = `${status}_${deps}` as keyof PTKPConfig;
    return config[key] || config.TK_0; // Default to TK/0
  }

  /**
   * Calculate progressive tax based on brackets
   */
  private calculateProgressiveTax(
    taxableIncome: number,
    brackets: TaxBracket[],
  ): { annualTax: number; taxDetails: any[] } {
    let remainingIncome = taxableIncome;
    let totalTax = 0;
    const taxDetails: any[] = [];
    let previousLimit = 0;

    for (let i = 0; i < brackets.length; i++) {
      const bracket = brackets[i];
      const bracketLimit = bracket.limit || Infinity;
      const bracketRange = bracketLimit - previousLimit;
      const incomeInBracket = Math.min(remainingIncome, bracketRange);

      if (incomeInBracket <= 0) break;

      const taxInBracket = incomeInBracket * bracket.rate;
      totalTax += taxInBracket;

      taxDetails.push({
        bracket: i + 1,
        income: incomeInBracket,
        rate: bracket.rate,
        tax: taxInBracket,
      });

      remainingIncome -= incomeInBracket;
      previousLimit = bracketLimit;

      if (remainingIncome <= 0) break;
    }

    return {
      annualTax: Math.round(totalTax),
      taxDetails,
    };
  }

  /**
   * Get tax calculation for employee based on their profile
   */
  async calculateTaxForEmployee(
    tenantSlug: string,
    employeeId: bigint,
    monthlyGrossSalary: number,
  ): Promise<TaxCalculationResult> {
    const employee = await this.prisma.getClient(tenantSlug).employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Map MaritalStatus enum to expected format
    let maritalStatus: 'SINGLE' | 'MARRIED' | null = null;
    if (employee.maritalStatus === 'SINGLE') {
      maritalStatus = 'SINGLE';
    } else if (employee.maritalStatus === 'MARRIED') {
      maritalStatus = 'MARRIED';
    }

    // Dependents (tanggungan) - you may want to add this field to Employee model
    const dependents = 0; // Default to 0 for now

    return this.calculatePPh21(tenantSlug, monthlyGrossSalary, maritalStatus, dependents);
  }
}
