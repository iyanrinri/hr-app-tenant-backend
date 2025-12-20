import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';

@Injectable()
export class SalaryRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any): Promise<any> {
    const client = this.prisma.getClient(tenantSlug);
    
    // Extract IDs from nested connect objects if needed
    const employeeId = data.employeeId || data.employee?.connect?.id;
    const createdBy = data.createdBy;
    
    // Validate required fields
    if (!employeeId) throw new Error('employeeId is required');
    if (!createdBy) throw new Error('createdBy is required');
    if (!data.baseSalary) throw new Error('baseSalary is required');
    if (!data.effectiveDate) throw new Error('effectiveDate is required');
    
    const effectiveDateStr = new Date(data.effectiveDate).toISOString().split('T')[0];
    const endDateStr = data.endDate ? `'${new Date(data.endDate).toISOString().split('T')[0]}'` : 'NULL';
    const grade = data.grade ? `'${data.grade.replace(/'/g, "''")}'` : 'NULL';
    const notes = data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL';
    const allowances = data.allowances || 0;
    const isActive = data.isActive !== undefined ? data.isActive : true;
    
    const insertQuery = `
      INSERT INTO salaries (
        "employeeId", "baseSalary", allowances, grade,
        "effectiveDate", "endDate", "isActive", notes, "createdBy"
      )
      VALUES (
        ${employeeId}, ${data.baseSalary}, ${allowances}, ${grade},
        '${effectiveDateStr}', ${endDateStr}, ${isActive}, ${notes}, ${createdBy}
      )
      RETURNING id
    `;
    
    const insertResult = await client.$queryRawUnsafe(insertQuery);
    const newId = insertResult[0].id;
    
    // Fetch the complete record with employee relation
    const selectQuery = `
      SELECT 
        s.*,
        row_to_json(e.*) as employee
      FROM salaries s
      LEFT JOIN employees e ON e.id = s."employeeId"
      WHERE s.id = ${newId}
    `;
    
    const result = await client.$queryRawUnsafe(selectQuery);
    return result[0];
  }

  async findAll(
    tenantSlug: string,
    params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
    include?: any;
  }): Promise<any[]> {
    const {skip, take, where, orderBy } = params;
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.employeeId !== undefined) conditions.push(`s."employeeId" = ${where.employeeId}`);
      if (where.isActive !== undefined) conditions.push(`s."isActive" = ${where.isActive}`);
      if (where.grade !== undefined) conditions.push(`s.grade = '${where.grade}'`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    let orderByClause = 'ORDER BY s."effectiveDate" DESC';
    if (orderBy) {
      const orderParts = [];
      for (const [field, direction] of Object.entries(orderBy)) {
        orderParts.push(`s."${field}" ${direction === 'asc' ? 'ASC' : 'DESC'}`);
      }
      if (orderParts.length > 0) {
        orderByClause = 'ORDER BY ' + orderParts.join(', ');
      }
    }
    
    let limitClause = '';
    if (take !== undefined) limitClause = `LIMIT ${take}`;
    if (skip !== undefined) limitClause += ` OFFSET ${skip}`;
    
    const query = `
      SELECT 
        s.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salaries s
      LEFT JOIN employees e ON e.id = s."employeeId"
      ${whereClause}
      ${orderByClause}
      ${limitClause}
    `;
    
    const results = await client.$queryRawUnsafe(query);
    
    return results.map((row: any) => ({
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        department: row.employee_department,
        position: row.employee_position
      }
    }));
  }

  async findUnique(
    tenantSlug: string, where: any, include?: any): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    const id = where.id;
    
    const query = `
      SELECT 
        s.*,
        row_to_json(e.*) as employee
      FROM salaries s
      LEFT JOIN employees e ON e.id = s."employeeId"
      WHERE s.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findFirst(
    tenantSlug: string, where: any, include?: any): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    
    const conditions = [];
    if (where.employeeId !== undefined) conditions.push(`s."employeeId" = ${where.employeeId}`);
    if (where.isActive !== undefined) conditions.push(`s."isActive" = ${where.isActive}`);
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    const query = `
      SELECT 
        s.*,
        row_to_json(e.*) as employee
      FROM salaries s
      LEFT JOIN employees e ON e.id = s."employeeId"
      ${whereClause}
      ORDER BY s."effectiveDate" DESC
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findCurrentSalary(
    tenantSlug: string, employeeId: bigint): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT 
        s.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salaries s
      LEFT JOIN employees e ON e.id = s."employeeId"
      WHERE s."employeeId" = ${employeeId}
        AND s."isActive" = true
        AND (s."endDate" IS NULL OR s."endDate" >= '${today}')
      ORDER BY s."effectiveDate" DESC
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    
    if (!result[0]) return null;
    
    const row = result[0];
    return {
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        department: row.employee_department,
        position: row.employee_position
      }
    };
  }

  async findEmployeeSalaryHistory(
    tenantSlug: string, employeeId: bigint): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        s.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salaries s
      LEFT JOIN employees e ON e.id = s."employeeId"
      WHERE s."employeeId" = ${employeeId}
      ORDER BY s."effectiveDate" DESC
    `;
    
    const results = await client.$queryRawUnsafe(query);
    
    return results.map((row: any) => ({
      ...row,
      employee: {
        id: row.employee_id,
        firstName: row.employee_firstName,
        lastName: row.employee_lastName,
        department: row.employee_department,
        position: row.employee_position
      }
    }));
  }

  async update(
    tenantSlug: string, where: any, data: any): Promise<any> {
    const client = this.prisma.getClient(tenantSlug);
    const id = where.id;
    
    const setClauses: string[] = [];
    
    if (data.baseSalary !== undefined) setClauses.push(`"baseSalary" = ${data.baseSalary}`);
    if (data.allowances !== undefined) setClauses.push(`allowances = ${data.allowances}`);
    if (data.grade !== undefined) setClauses.push(`grade = ${data.grade ? `'${data.grade.replace(/'/g, "''")}'` : 'NULL'}`);
    if (data.effectiveDate !== undefined) {
      const effectiveDateStr = new Date(data.effectiveDate).toISOString().split('T')[0];
      setClauses.push(`"effectiveDate" = '${effectiveDateStr}'`);
    }
    if (data.endDate !== undefined) {
      const endDateStr = data.endDate ? `'${new Date(data.endDate).toISOString().split('T')[0]}'` : 'NULL';
      setClauses.push(`"endDate" = ${endDateStr}`);
    }
    if (data.isActive !== undefined) setClauses.push(`"isActive" = ${data.isActive}`);
    if (data.notes !== undefined) setClauses.push(`notes = ${data.notes ? `'${data.notes.replace(/'/g, "''")}'` : 'NULL'}`);
    
    setClauses.push(`"updatedAt" = NOW()`);
    
    const setClause = setClauses.join(', ');
    
    const query = `
      UPDATE salaries
      SET ${setClause}
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async delete(
    tenantSlug: string, where: any): Promise<any> {
    const client = this.prisma.getClient(tenantSlug);
    const id = where.id;
    
    const query = `
      DELETE FROM salaries
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async count(tenantSlug: string, where?: any): Promise<number> {
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.employeeId !== undefined) conditions.push(`"employeeId" = ${where.employeeId}`);
      if (where.isActive !== undefined) conditions.push(`"isActive" = ${where.isActive}`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    const query = `
      SELECT COUNT(*)::int as count
      FROM salaries
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0].count;
  }

  async endCurrentSalary(
    tenantSlug: string, employeeId: bigint, endDate: Date): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    const endDateStr = endDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
      UPDATE salaries
      SET "endDate" = '${endDateStr}',
          "isActive" = false,
          "updatedAt" = NOW()
      WHERE "employeeId" = ${employeeId}
        AND "isActive" = true
        AND ("endDate" IS NULL OR "endDate" >= '${today}')
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result;
  }
}
