import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { PayrollQueryDto, PayrollStatus } from '../dto/payroll-query.dto';
import { convertBigIntAndDecimalToString } from '@/common/utils/bigint-converter';

@Injectable()
export class PayrollRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    // Extract IDs from nested connect objects if needed
    const employeeId = data.employeeId || data.employee?.connect?.id;
    const processedBy = data.processedBy || data.processor?.connect?.id;
    
    // Validate required fields
    if (!employeeId) throw new Error('employeeId is required');
    if (!data.periodStart) throw new Error('periodStart is required');
    if (!data.periodEnd) throw new Error('periodEnd is required');
    
    const periodStartStr = new Date(data.periodStart).toISOString().split('T')[0];
    const periodEndStr = new Date(data.periodEnd).toISOString().split('T')[0];
    const baseSalary = data.baseSalary || 0;
    const overtimePay = data.overtimePay || 0;
    const deductions = data.deductions || 0;
    const bonuses = data.bonuses || 0;
    const grossSalary = data.grossSalary || 0;
    const netSalary = data.netSalary || 0;
    const regularHours = data.regularHours || 0;
    const overtimeHours = data.overtimeHours || 0;
    const isPaid = data.isPaid || false;
    const processedAt = data.processedAt ? `'${new Date(data.processedAt).toISOString()}'` : 'NULL';
    const processedByValue = processedBy !== undefined ? processedBy : 'NULL';
    
    const insertQuery = `
      INSERT INTO payrolls (
        "employeeId", "periodStart", "periodEnd", "baseSalary",
        "overtimePay", deductions, bonuses, "grossSalary", "netSalary",
        "regularHours", "overtimeHours", "isPaid",
        "processedAt", "processedBy"
      )
      VALUES (
        ${employeeId}, '${periodStartStr}', '${periodEndStr}', ${baseSalary},
        ${overtimePay}, ${deductions}, ${bonuses}, ${grossSalary}, ${netSalary},
        ${regularHours}, ${overtimeHours}, ${isPaid},
        ${processedAt}, ${processedByValue}
      )
      RETURNING id
    `;
    
    const insertResult = await client.$queryRawUnsafe(insertQuery);
    const newId = insertResult[0].id;
    
    // Fetch the complete record with relations
    const selectQuery = `
      SELECT 
        p.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.position as "employee_position",
        e.department as "employee_department",
        u.id as "processor_id",
        u.email as "processor_email"
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      LEFT JOIN users u ON u.id = p."processedBy"
      WHERE p.id = ${newId}
    `;
    
    const result = await client.$queryRawUnsafe(selectQuery);
    const row = result[0];
    
    return convertBigIntAndDecimalToString({
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        position: row.employee_position,
        department: row.employee_department
      },
      processor: row.processor_id ? {
        id: row.processor_id,
        email: row.processor_email
      } : null
    });
  }

  async findMany(tenantSlug: string, query: PayrollQueryDto) {
    const {
      employeeId,
      department,
      periodStartFrom,
      periodStartTo,
      periodEndFrom,
      periodEndTo,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const client = this.prisma.getClient(tenantSlug);
    const skip = (page - 1) * limit;
    
    const conditions = [];

    // Employee filter
    if (employeeId) {
      conditions.push(`p."employeeId" = ${employeeId}`);
    }

    // Department filter
    if (department) {
      conditions.push(`LOWER(e.department) LIKE LOWER('%${department.replace(/'/g, "''")}%')`);
    }

    // Period start filters
    if (periodStartFrom && periodStartTo) {
      conditions.push(`p."periodStart" >= '${new Date(periodStartFrom).toISOString().split('T')[0]}'`);
      conditions.push(`p."periodStart" <= '${new Date(periodStartTo).toISOString().split('T')[0]}'`);
    } else if (periodStartFrom) {
      conditions.push(`p."periodStart" >= '${new Date(periodStartFrom).toISOString().split('T')[0]}'`);
    } else if (periodStartTo) {
      conditions.push(`p."periodStart" <= '${new Date(periodStartTo).toISOString().split('T')[0]}'`);
    }

    // Period end filters
    if (periodEndFrom && periodEndTo) {
      conditions.push(`p."periodEnd" >= '${new Date(periodEndFrom).toISOString().split('T')[0]}'`);
      conditions.push(`p."periodEnd" <= '${new Date(periodEndTo).toISOString().split('T')[0]}'`);
    } else if (periodEndFrom) {
      conditions.push(`p."periodEnd" >= '${new Date(periodEndFrom).toISOString().split('T')[0]}'`);
    } else if (periodEndTo) {
      conditions.push(`p."periodEnd" <= '${new Date(periodEndTo).toISOString().split('T')[0]}'`);
    }

    // Status filter
    if (status) {
      switch (status) {
        case PayrollStatus.PENDING:
          conditions.push(`p."processedAt" IS NULL`);
          conditions.push(`p."isPaid" = false`);
          break;
        case PayrollStatus.PROCESSED:
          conditions.push(`p."processedAt" IS NOT NULL`);
          conditions.push(`p."isPaid" = false`);
          break;
        case PayrollStatus.PAID:
          conditions.push(`p."isPaid" = true`);
          break;
      }
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Order by clause
    let orderByClause = '';
    if (sortBy === 'employee') {
      orderByClause = `ORDER BY e."firstName" ${sortOrder.toUpperCase()}`;
    } else {
      orderByClause = `ORDER BY p."${sortBy}" ${sortOrder.toUpperCase()}`;
    }

    // Query for payrolls
    const dataQuery = `
      SELECT 
        p.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.position as "employee_position",
        e.department as "employee_department",
        u.id as "processor_id",
        u.email as "processor_email"
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      LEFT JOIN users u ON u.id = p."processedBy"
      ${whereClause}
      ${orderByClause}
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Query for count
    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      ${whereClause}
    `;

    const [payrollsResult, countResult] = await Promise.all([
      client.$queryRawUnsafe(dataQuery),
      client.$queryRawUnsafe(countQuery),
    ]);

    const payrolls = payrollsResult.map((row: any) => convertBigIntAndDecimalToString({
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        position: row.employee_position,
        department: row.employee_department
      },
      processor: row.processor_id ? {
        id: row.processor_id,
        email: row.processor_email
      } : null
    }));

    const total = countResult[0].count;

    return {
      data: payrolls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(tenantSlug: string, id: string) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        p.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.position as "employee_position",
        e.department as "employee_department",
        u.id as "processor_id",
        u.email as "processor_email"
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      LEFT JOIN users u ON u.id = p."processedBy"
      WHERE p.id = ${id}
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
        position: row.employee_position,
        department: row.employee_department
      },
      processor: row.processor_id ? {
        id: row.processor_id,
        email: row.processor_email
      } : null
    });
  }

  async findByEmployeeAndPeriod(
    tenantSlug: string,
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    const client = this.prisma.getClient(tenantSlug);
    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];
    
    const query = `
      SELECT 
        p.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.position as "employee_position",
        e.department as "employee_department"
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      WHERE p."employeeId" = ${employeeId}
        AND (
          (p."periodStart" <= '${periodStartStr}' AND p."periodEnd" >= '${periodStartStr}')
          OR (p."periodStart" <= '${periodEndStr}' AND p."periodEnd" >= '${periodEndStr}')
          OR (p."periodStart" >= '${periodStartStr}' AND p."periodEnd" <= '${periodEndStr}')
        )
      LIMIT 1
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
        position: row.employee_position,
        department: row.employee_department
      }
    });
  }

  async update(tenantSlug: string, id: string, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    const setClauses: string[] = [];
    
    if (data.periodStart !== undefined) {
      const periodStartStr = new Date(data.periodStart).toISOString().split('T')[0];
      setClauses.push(`"periodStart" = '${periodStartStr}'`);
    }
    if (data.periodEnd !== undefined) {
      const periodEndStr = new Date(data.periodEnd).toISOString().split('T')[0];
      setClauses.push(`"periodEnd" = '${periodEndStr}'`);
    }
    if (data.baseSalary !== undefined) setClauses.push(`"baseSalary" = ${data.baseSalary}`);
    if (data.overtimePay !== undefined) setClauses.push(`"overtimePay" = ${data.overtimePay}`);
    if (data.deductions !== undefined) setClauses.push(`deductions = ${data.deductions}`);
    if (data.bonuses !== undefined) setClauses.push(`bonuses = ${data.bonuses}`);
    if (data.grossSalary !== undefined) setClauses.push(`"grossSalary" = ${data.grossSalary}`);
    if (data.netSalary !== undefined) setClauses.push(`"netSalary" = ${data.netSalary}`);
    if (data.regularHours !== undefined) setClauses.push(`"regularHours" = ${data.regularHours}`);
    if (data.overtimeHours !== undefined) setClauses.push(`"overtimeHours" = ${data.overtimeHours}`);
    if (data.isPaid !== undefined) setClauses.push(`"isPaid" = ${data.isPaid}`);
    if (data.processedAt !== undefined) {
      setClauses.push(`"processedAt" = ${data.processedAt ? `'${new Date(data.processedAt).toISOString()}'` : 'NULL'}`);
    }
    if (data.processedBy !== undefined) setClauses.push(`"processedBy" = ${data.processedBy !== null ? data.processedBy : 'NULL'}`);
    
    setClauses.push(`"updatedAt" = NOW()`);
    
    const setClause = setClauses.join(', ');
    
    const updateQuery = `
      UPDATE payrolls
      SET ${setClause}
      WHERE id = ${id}
      RETURNING id
    `;
    
    await client.$queryRawUnsafe(updateQuery);
    
    // Fetch the complete record with relations
    const selectQuery = `
      SELECT 
        p.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.position as "employee_position",
        e.department as "employee_department",
        u.id as "processor_id",
        u.email as "processor_email"
      FROM payrolls p
      LEFT JOIN employees e ON e.id = p."employeeId"
      LEFT JOIN users u ON u.id = p."processedBy"
      WHERE p.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(selectQuery);
    const row = result[0];
    
    return convertBigIntAndDecimalToString({
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        position: row.employee_position,
        department: row.employee_department
      },
      processor: row.processor_id ? {
        id: row.processor_id,
        email: row.processor_email
      } : null
    });
  }

  async updateMany(tenantSlug: string, ids: string[], data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    const setClauses: string[] = [];
    
    if (data.isPaid !== undefined) setClauses.push(`"isPaid" = ${data.isPaid}`);
    if (data.processedAt !== undefined) {
      setClauses.push(`"processedAt" = ${data.processedAt ? `'${new Date(data.processedAt).toISOString()}'` : 'NULL'}`);
    }
    if (data.processedBy !== undefined) setClauses.push(`"processedBy" = ${data.processedBy !== null ? data.processedBy : 'NULL'}`);
    
    setClauses.push(`"updatedAt" = NOW()`);
    
    const setClause = setClauses.join(', ');
    const idsClause = ids.join(', ');
    
    const query = `
      UPDATE payrolls
      SET ${setClause}
      WHERE id IN (${idsClause})
    `;
    
    await client.$queryRawUnsafe(query);
    
    return { count: ids.length };
  }

  async delete(tenantSlug: string, id: string) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      DELETE FROM payrolls
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return convertBigIntAndDecimalToString(result[0]);
  }

  async getPayrollSummary(tenantSlug: string, employeeId?: string) {
    const client = this.prisma.getClient(tenantSlug);
    
    const whereClause = employeeId ? `WHERE "employeeId" = ${employeeId}` : '';
    
    const query = `
      SELECT 
        COUNT(*)::int as "totalPayrolls",
        COALESCE(SUM("baseSalary"), 0) as "totalBaseSalary",
        COALESCE(SUM("overtimePay"), 0) as "totalOvertimePay",
        COALESCE(SUM(deductions), 0) as "totalDeductions",
        COALESCE(SUM(bonuses), 0) as "totalBonuses",
        COALESCE(SUM("grossSalary"), 0) as "totalGrossSalary",
        COALESCE(SUM("netSalary"), 0) as "totalNetSalary",
        COALESCE(SUM("overtimeHours"), 0) as "totalOvertimeHours",
        COALESCE(SUM("regularHours"), 0) as "totalRegularHours"
      FROM payrolls
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    const row = result[0];
    
    return {
      totalPayrolls: row.totalPayrolls,
      totalBaseSalary: row.totalBaseSalary.toString(),
      totalOvertimePay: row.totalOvertimePay.toString(),
      totalDeductions: row.totalDeductions.toString(),
      totalBonuses: row.totalBonuses.toString(),
      totalGrossSalary: row.totalGrossSalary.toString(),
      totalNetSalary: row.totalNetSalary.toString(),
      totalOvertimeHours: row.totalOvertimeHours.toString(),
      totalRegularHours: row.totalRegularHours.toString(),
    };
  }
}