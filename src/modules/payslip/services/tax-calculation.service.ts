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
   * Falls back to 2024 Indonesia PTKP defaults
   */
  private async getPTKPConfig(tenantSlug: string): Promise<PTKPConfig> {
    // Default PTKP values for 2024 (in IDR)
    const defaultConfig: PTKPConfig = {
      TK_0: 54000000,   // Tidak Kawin, 0 tanggungan
      TK_1: 58500000,   // Tidak Kawin, 1 tanggungan
      TK_2: 63000000,   // Tidak Kawin, 2 tanggungan
      TK_3: 67500000,   // Tidak Kawin, 3 tanggungan
      K_0: 58500000,    // Kawin, 0 tanggungan
      K_1: 63000000,    // Kawin, 1 tanggungan
      K_2: 67500000,    // Kawin, 2 tanggungan
      K_3: 72000000,    // Kawin, 3 tanggungan
    };

    try {
      const client = this.prisma.getClient(tenantSlug);
      
      // Check if setting model exists
      if (!client.setting) {
        return defaultConfig;
      }

      const ptkpSettings = await client.setting.findMany({
        where: {
          category: SettingCategory.TAX_PPH21,
          key: {
            startsWith: 'TAX_PTKP_',
          },
        },
      });

      // If no settings found, use defaults
      if (!ptkpSettings || ptkpSettings.length === 0) {
        return defaultConfig;
      }

      const config: any = {};
      ptkpSettings.forEach((setting: any) => {
        const key = setting.key.replace('TAX_PTKP_', '');
        config[key] = parseFloat(setting.value);
      });

      return { ...defaultConfig, ...config } as PTKPConfig;
    } catch (error) {
      // If settings table doesn't exist or any error, use defaults
      return defaultConfig;
    }
  }

  /**
   * Get Tax Brackets configuration from Settings table
   * Falls back to 2024 Indonesia PPh 21 progressive tax rates
   */
  private async getTaxBrackets(tenantSlug: string): Promise<TaxBracket[]> {
    // Default tax brackets for 2024 Indonesia PPh 21
    const defaultBrackets: TaxBracket[]= [
      { limit: 60000000, rate: 0.05 },      // 0 - 60 juta: 5%
      { limit: 250000000, rate: 0.15 },     // 60 - 250 juta: 15%
      { limit: 500000000, rate: 0.25 },     // 250 - 500 juta: 25%
      { limit: 5000000000, rate: 0.30 },    // 500 juta - 5 miliar: 30%
      { limit: null, rate: 0.35 },          // > 5 miliar: 35%
    ];

    try {
      const client = this.prisma.getClient(tenantSlug);
      
      // Check if setting model exists
      if (!client.setting) {
        return defaultBrackets;
      }

      const bracketSettings = await client.setting.findMany({
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

      // If no settings found, use defaults
      if (!bracketSettings || bracketSettings.length === 0) {
        return defaultBrackets;
      }

      // Parse brackets from settings
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
          limit: limits[i] !== undefined ? limits[i] : null,
          rate: rates[i] || 0,
        });
      }

      return brackets.length > 0 ? brackets : defaultBrackets;
    } catch (error) {
      // If settings table doesn't exist or any error, use defaults
      return defaultBrackets;
    }
  }

  /**
   * DEPRECATED: Old getTaxBrackets implementation
   * Kept for reference when implementing settings table
   */
  private async getTaxBracketsFromSettings(tenantSlug: string): Promise<TaxBracket[]> {
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
