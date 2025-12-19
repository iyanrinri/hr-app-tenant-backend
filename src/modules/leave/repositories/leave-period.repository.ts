import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '../../../database/multi-tenant-prisma.service'; 

@Injectable()
export class LeavePeriodRepository {
  constructor(private prisma: MultiTenantPrismaService) {}
  async create(tenantSlug: string, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    // Convert dates to YYYY-MM-DD format
    const startDate = new Date(data.startDate).toISOString().split('T')[0];
    const endDate = new Date(data.endDate).toISOString().split('T')[0];
    
    const result = await client.$queryRawUnsafe(`
      INSERT INTO "leave_period" (
        name, "startDate", "endDate", "isActive", description, "createdBy", "createdAt", "updatedAt"
      ) VALUES (
        '${data.name}',
        '${startDate}',
        '${endDate}',
        ${data.isActive !== undefined ? data.isActive : false},
        ${data.description ? `'${data.description.replace(/'/g, "''")}'` : 'NULL'},
        ${data.createdBy},
        NOW(),
        NOW()
      )
      RETURNING *
    `);
    
    return result[0];
  }

  async findAll(tenantSlug: string, params?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }) {
    const { skip = 0, take = 10, where, orderBy } = params || {};
    const client = this.prisma.getClient(tenantSlug);
    
    // Build WHERE clause
    let whereClause = '1=1';
    if (where?.isActive !== undefined) {
      whereClause += ` AND lp."isActive" = ${where.isActive}`;
    }
    
    // Build ORDER BY clause
    const orderByClause = orderBy?.startDate 
      ? `ORDER BY lp."startDate" ${orderBy.startDate === 'desc' ? 'DESC' : 'ASC'}` 
      : 'ORDER BY lp."startDate" DESC';
    
    const result = await client.$queryRawUnsafe(`
      SELECT 
        lp.*,
        COUNT(DISTINCT lb.id) as "leaveBalances_count",
        COUNT(DISTINCT lr.id) as "leaveRequests_count"
      FROM "leave_period" lp
      LEFT JOIN "leave_balance" lb ON lp.id = lb."leavePeriodId"
      LEFT JOIN "leave_request" lr ON lp.id = lr."leavePeriodId"
      WHERE ${whereClause}
      GROUP BY lp.id
      ${orderByClause}
      LIMIT ${take} OFFSET ${skip}
    `);
    
    return result.map((row: any) => ({
      ...row,
      _count: {
        leaveBalances: Number(row.leaveBalances_count || 0),
        leaveRequests: Number(row.leaveRequests_count || 0)
      }
    }));
  }

  async findById(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const periodResult = await client.$queryRaw`
      SELECT * FROM "leave_period" WHERE id = ${id}
    `;
    
    if (!periodResult || periodResult.length === 0) {
      return null;
    }
    
    const period = periodResult[0];
    
    // Get leave types for this period
    const leaveTypes = await client.$queryRaw`
      SELECT * FROM "leave_type_config" WHERE "leavePeriodId" = ${id}
    `;
    
    // Get leave balances with employee info
    const leaveBalances = await client.$queryRawUnsafe(`
      SELECT 
        lb.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department"
      FROM "leave_balance" lb
      LEFT JOIN "employees" e ON lb."employeeId" = e.id
      WHERE lb."leavePeriodId" = ${id}
    `);
    
    return {
      ...period,
      leaveTypes: leaveTypes || [],
      leaveBalances: leaveBalances.map((lb: any) => ({
        ...lb,
        employee: {
          id: lb.employee_id,
          firstName: lb.employee_firstName,
          lastName: lb.employee_lastName,
          department: lb.employee_department
        }
      })) || []
    };
  }

  async findActive(tenantSlug: string) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        lp.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ltc.id,
              'type', ltc.type,
              'name', ltc.name,
              'defaultQuota', ltc."defaultQuota",
              'maxConsecutiveDays', ltc."maxConsecutiveDays",
              'advanceNoticeDays', ltc."advanceNoticeDays",
              'isCarryForward', ltc."isCarryForward",
              'maxCarryForward', ltc."maxCarryForward",
              'requiresApproval', ltc."requiresApproval",
              'allowNegativeBalance', ltc."allowNegativeBalance",
              'description', ltc.description,
              'isActive', ltc."isActive"
            )
          ) FILTER (WHERE ltc.id IS NOT NULL), '[]'
        ) as "leaveTypes"
      FROM leave_period lp
      LEFT JOIN leave_type_config ltc ON ltc."leavePeriodId" = lp.id AND ltc."isActive" = true
      WHERE lp."isActive" = true
      GROUP BY lp.id, lp.name, lp."startDate", lp."endDate", lp."isActive", lp."createdAt", lp."updatedAt"
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async update(tenantSlug: string, id: bigint, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    const updates: string[] = [];
    if (data.name !== undefined) {
      updates.push(`name = '${data.name.replace(/'/g, "''")}'`);
    }
    if (data.startDate !== undefined) {
      const startDate = new Date(data.startDate).toISOString().split('T')[0];
      updates.push(`"startDate" = '${startDate}'`);
    }
    if (data.endDate !== undefined) {
      const endDate = new Date(data.endDate).toISOString().split('T')[0];
      updates.push(`"endDate" = '${endDate}'`);
    }
    if (data.isActive !== undefined) {
      updates.push(`"isActive" = ${data.isActive}`);
    }
    if (data.description !== undefined) {
      updates.push(`description = ${data.description ? `'${data.description.replace(/'/g, "''")}'` : 'NULL'}`);
    }
    
    updates.push(`"updatedAt" = NOW()`);
    
    const result = await client.$queryRawUnsafe(`
      UPDATE "leave_period"
      SET ${updates.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `);
    
    return result[0];
  }

  async delete(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const result = await client.$queryRaw`
      DELETE FROM "leave_period" WHERE id = ${id} RETURNING *
    `;
    
    return result[0];
  }

  async count(tenantSlug: string, where?: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    // Build WHERE clause
    let whereClause = '1=1';
    if (where?.isActive !== undefined) {
      whereClause += ` AND "isActive" = ${where.isActive}`;
    }
    
    const result = await client.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "leave_period" WHERE ${whereClause}
    `);
    
    return Number(result[0].count);
  }
}