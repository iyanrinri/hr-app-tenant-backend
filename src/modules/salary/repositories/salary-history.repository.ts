import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';


@Injectable()
export class SalaryHistoryRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any): Promise<any> {
    const client = this.prisma.getClient(tenantSlug);
    
    // Extract IDs from nested connect objects if needed
    const employeeId = data.employeeId || data.employee?.connect?.id;
    
    // Validate required fields
    if (!employeeId) throw new Error('employeeId is required');
    if (!data.changeType) throw new Error('changeType is required');
    if (!data.newBaseSalary) throw new Error('newBaseSalary is required');
    if (!data.effectiveDate) throw new Error('effectiveDate is required');
    if (!data.reason) throw new Error('reason is required');
    
    const effectiveDateStr = new Date(data.effectiveDate).toISOString().split('T')[0];
    const oldBaseSalary = data.oldBaseSalary !== undefined ? data.oldBaseSalary : 'NULL';
    const oldGrade = data.oldGrade ? `'${data.oldGrade.replace(/'/g, "''")}'` : 'NULL';
    const newGrade = data.newGrade ? `'${data.newGrade.replace(/'/g, "''")}'` : 'NULL';
    const oldPosition = data.oldPosition ? `'${data.oldPosition.replace(/'/g, "''")}'` : 'NULL';
    const newPosition = data.newPosition ? `'${data.newPosition.replace(/'/g, "''")}'` : 'NULL';
    const oldDepartment = data.oldDepartment ? `'${data.oldDepartment.replace(/'/g, "''")}'` : 'NULL';
    const newDepartment = data.newDepartment ? `'${data.newDepartment.replace(/'/g, "''")}'` : 'NULL';
    const reason = data.reason.replace(/'/g, "''");
    const approvedBy = data.approvedBy !== undefined ? data.approvedBy : 'NULL';
    
    const insertQuery = `
      INSERT INTO salary_histories (
        "employeeId", "changeType", "oldBaseSalary", "newBaseSalary",
        "oldGrade", "newGrade", "oldPosition", "newPosition",
        "oldDepartment", "newDepartment", reason, "effectiveDate", "approvedBy"
      )
      VALUES (
        ${employeeId}, '${data.changeType}'::"SalaryChangeType",
        ${oldBaseSalary}, ${data.newBaseSalary},
        ${oldGrade}, ${newGrade}, ${oldPosition}, ${newPosition},
        ${oldDepartment}, ${newDepartment}, '${reason}',
        '${effectiveDateStr}', ${approvedBy}
      )
      RETURNING id
    `;
    
    const insertResult = await client.$queryRawUnsafe(insertQuery);
    const newId = insertResult[0].id;
    
    // Fetch the complete record with employee relation
    const selectQuery = `
      SELECT 
        sh.*,
        row_to_json(e.*) as employee
      FROM salary_histories sh
      LEFT JOIN employees e ON e.id = sh."employeeId"
      WHERE sh.id = ${newId}
    `;
    
    const result = await client.$queryRawUnsafe(selectQuery);
    return result[0];
  }

  async findAll(tenantSlug: string, params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
    include?: any;
  }): Promise<any[]> {
    const { skip, take, where, orderBy } = params;
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.employeeId !== undefined) conditions.push(`sh."employeeId" = ${where.employeeId}`);
      if (where.changeType !== undefined) conditions.push(`sh."changeType" = '${where.changeType}'`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    let orderByClause = 'ORDER BY sh."effectiveDate" DESC';
    if (orderBy) {
      const orderParts = [];
      for (const [field, direction] of Object.entries(orderBy)) {
        orderParts.push(`sh."${field}" ${direction === 'asc' ? 'ASC' : 'DESC'}`);
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
        sh.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salary_histories sh
      LEFT JOIN employees e ON e.id = sh."employeeId"
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

  async findUnique(tenantSlug: string, where: any, include?: any): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    const id = where.id;
    
    const query = `
      SELECT 
        sh.*,
        row_to_json(e.*) as employee
      FROM salary_histories sh
      LEFT JOIN employees e ON e.id = sh."employeeId"
      WHERE sh.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findEmployeeHistory(tenantSlug: string, employeeId: bigint): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        sh.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salary_histories sh
      LEFT JOIN employees e ON e.id = sh."employeeId"
      WHERE sh."employeeId" = ${employeeId}
      ORDER BY sh."effectiveDate" DESC
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

  async findByDateRange(tenantSlug: string, employeeId: bigint, startDate: Date, endDate: Date): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const query = `
      SELECT 
        sh.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salary_histories sh
      LEFT JOIN employees e ON e.id = sh."employeeId"
      WHERE sh."employeeId" = ${employeeId}
        AND sh."effectiveDate" >= '${startDateStr}'
        AND sh."effectiveDate" <= '${endDateStr}'
      ORDER BY sh."effectiveDate" DESC
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

  async findByChangeType(tenantSlug: string, changeType: string): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        sh.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position"
      FROM salary_histories sh
      LEFT JOIN employees e ON e.id = sh."employeeId"
      WHERE sh."changeType" = '${changeType}'::"SalaryChangeType"
      ORDER BY sh."effectiveDate" DESC
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

  async count(tenantSlug: string, where?: any): Promise<number> {
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.employeeId !== undefined) conditions.push(`"employeeId" = ${where.employeeId}`);
      if (where.changeType !== undefined) conditions.push(`"changeType" = '${where.changeType}'`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    const query = `
      SELECT COUNT(*)::int as count
      FROM salary_histories
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0].count;
  }
}
