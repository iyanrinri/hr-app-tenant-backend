import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { convertBigIntAndDecimalToString } from '@/common/utils/bigint-converter';

@Injectable()
export class PayslipRepository {
  constructor(private readonly prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    const taxCalculationDetails = data.taxCalculationDetails 
      ? `'${JSON.stringify(data.taxCalculationDetails).replace(/'/g, "''")}'` 
      : 'NULL';
    
    const pdfUrl = data.pdfUrl ? `'${data.pdfUrl.replace(/'/g, "''")}'` : 'NULL';
    
    const insertQuery = `
      INSERT INTO payslips (
        "payrollId", "grossSalary", "overtimePay", bonuses, allowances,
        "taxAmount", "bpjsKesehatanEmployee", "bpjsKesehatanCompany",
        "bpjsKetenagakerjaanEmployee", "bpjsKetenagakerjaanCompany",
        "otherDeductions", "takeHomePay", "taxCalculationDetails",
        "pdfUrl", "generatedBy"
      )
      VALUES (
        ${data.payrollId}, ${data.grossSalary}, ${data.overtimePay}, 
        ${data.bonuses}, ${data.allowances}, ${data.taxAmount},
        ${data.bpjsKesehatanEmployee}, ${data.bpjsKesehatanCompany},
        ${data.bpjsKetenagakerjaanEmployee}, ${data.bpjsKetenagakerjaanCompany},
        ${data.otherDeductions}, ${data.takeHomePay}, ${taxCalculationDetails},
        ${pdfUrl}, ${data.generatedBy}
      )
      RETURNING id
    `;
    
    const insertResult = await client.$queryRawUnsafe(insertQuery);
    const newId = insertResult[0].id;
    
    return this.findOne(tenantSlug, newId);
  }

  async findOne(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        ps.*,
        pr.id as "payroll_id",
        pr."periodStart" as "payroll_periodStart",
        pr."periodEnd" as "payroll_periodEnd",
        pr."baseSalary" as "payroll_baseSalary",
        pr."overtimePay" as "payroll_overtimePay",
        pr.bonuses as "payroll_bonuses",
        pr."isPaid" as "payroll_isPaid",
        pr."paidAt" as "payroll_paidAt",
        pr."processedAt" as "payroll_processedAt",
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.position as "employee_position",
        e.department as "employee_department",
        e."employeeNumber" as "employee_employeeNumber",
        e."maritalStatus" as "employee_maritalStatus",
        u.id as "generator_id",
        u.email as "generator_email",
        u.role as "generator_role"
      FROM payslips ps
      LEFT JOIN payrolls pr ON pr.id = ps."payrollId"
      LEFT JOIN employees e ON e.id = pr."employeeId"
      LEFT JOIN users u ON u.id = ps."generatedBy"
      WHERE ps.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    
    if (!result[0]) return null;
    
    const row = result[0];
    
    // Get deductions
    const deductionsQuery = `
      SELECT * FROM payroll_deductions WHERE "payslipId" = ${id}
    `;
    const deductions = await client.$queryRawUnsafe(deductionsQuery);
    
    // Clean up flattened fields before returning
    const cleanedRow = { ...row };
    delete cleanedRow.payroll_id;
    delete cleanedRow.payroll_periodStart;
    delete cleanedRow.payroll_periodEnd;
    delete cleanedRow.payroll_baseSalary;
    delete cleanedRow.payroll_overtimePay;
    delete cleanedRow.payroll_bonuses;
    delete cleanedRow.payroll_isPaid;
    delete cleanedRow.payroll_paidAt;
    delete cleanedRow.payroll_processedAt;
    delete cleanedRow.employee_id;
    delete cleanedRow.employee_firstName;
    delete cleanedRow.employee_lastName;
    delete cleanedRow.employee_position;
    delete cleanedRow.employee_department;
    delete cleanedRow.employee_employeeNumber;
    delete cleanedRow.employee_maritalStatus;
    delete cleanedRow.generator_id;
    delete cleanedRow.generator_email;
    delete cleanedRow.generator_role;
    
    return convertBigIntAndDecimalToString({
      ...cleanedRow,
      payroll: {
        id: row.payroll_id,
        periodStart: row.payroll_periodStart,
        periodEnd: row.payroll_periodEnd,
        baseSalary: row.payroll_baseSalary,
        overtimePay: row.payroll_overtimePay,
        bonuses: row.payroll_bonuses,
        isPaid: row.payroll_isPaid,
        paidAt: row.payroll_paidAt,
        processedAt: row.payroll_processedAt,
        employee: {
          id: row.employee_id,
          firstName: row.employee_firstName,
          lastName: row.employee_lastName,
          position: row.employee_position,
          department: row.employee_department,
          employeeNumber: row.employee_employeeNumber,
          maritalStatus: row.employee_maritalStatus,
        },
      },
      generator: {
        id: row.generator_id,
        email: row.generator_email,
        role: row.generator_role,
      },
      deductions: deductions,
    });
  }

  async findByPayrollId(tenantSlug: string, payrollId: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT id FROM payslips WHERE "payrollId" = ${payrollId} LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    
    if (!result[0]) return null;
    
    return this.findOne(tenantSlug, result[0].id);
  }

  async findByEmployeeId(tenantSlug: string, employeeId: bigint, limit: number = 10) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        ps.*,
        pr."periodStart" as "payroll_periodStart",
        pr."periodEnd" as "payroll_periodEnd",
        pr."baseSalary" as "payroll_baseSalary",
        pr."overtimePay" as "payroll_overtimePay",
        pr.bonuses as "payroll_bonuses"
      FROM payslips ps
      LEFT JOIN payrolls pr ON pr.id = ps."payrollId"
      WHERE pr."employeeId" = ${employeeId}
      ORDER BY ps."generatedAt" DESC
      LIMIT ${limit}
    `;
    
    const results = await client.$queryRawUnsafe(query);
    
    return results.map((row: any) => {
      return convertBigIntAndDecimalToString({
        ...row,
        payroll: {
          periodStart: row.payroll_periodStart,
          periodEnd: row.payroll_periodEnd,
          baseSalary: row.payroll_baseSalary,
          overtimePay: row.payroll_overtimePay,
          bonuses: row.payroll_bonuses,
        },
      });
    });
  }

  async createDeduction(tenantSlug: string, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      INSERT INTO payroll_deductions ("payslipId", type, description, amount)
      VALUES (${data.payslipId}, '${data.type}', '${data.description.replace(/'/g, "''")}', ${data.amount})
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return convertBigIntAndDecimalToString(result[0]);
  }

  async createManyDeductions(tenantSlug: string, data: any[]) {
    const client = this.prisma.getClient(tenantSlug);
    
    const values = data.map(d => 
      `(${d.payslipId}, '${d.type}', '${d.description.replace(/'/g, "''")}', ${d.amount})`
    ).join(', ');
    
    const query = `
      INSERT INTO payroll_deductions ("payslipId", type, description, amount)
      VALUES ${values}
    `;
    
    await client.$queryRawUnsafe(query);
    return { count: data.length };
  }

  async delete(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      DELETE FROM payslips WHERE id = ${id} RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return convertBigIntAndDecimalToString(result[0]);
  }

  async updatePdfUrl(tenantSlug: string, id: bigint, pdfUrl: string) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      UPDATE payslips 
      SET "pdfUrl" = '${pdfUrl.replace(/'/g, "''")}', "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return convertBigIntAndDecimalToString(result[0]);
  }

  async getEmployeeIdByUserId(tenantSlug: string, userId: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT id FROM employees WHERE "userId" = ${userId} LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] ? convertBigIntAndDecimalToString(result[0]) : null;
  }

  async getPayrollWithEmployee(tenantSlug: string, payrollId: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        p.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e."maritalStatus" as "employee_maritalStatus",
        e.position as "employee_position",
        e.department as "employee_department"
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      WHERE p.id = ${payrollId}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    
    if (!result[0]) return null;
    
    const row = result[0];
    return convertBigIntAndDecimalToString({
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        maritalStatus: row.employee_maritalStatus,
        position: row.employee_position,
        department: row.employee_department,
      },
    });
  }
}
