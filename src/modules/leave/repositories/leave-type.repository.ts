import { Injectable } from '@nestjs/common';
import { LeavePrismaService } from '../../../database/leave-prisma.service';

@Injectable()
export class LeaveTypeRepository {
  constructor(private leavePrismaService: LeavePrismaService) {}

  async create(tenantSlug: string, data: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    // Extract leavePeriodId from nested connect object if needed
    const leavePeriodId = data.leavePeriodId || data.leavePeriod?.connect?.id;
    
    if (!leavePeriodId) {
      throw new Error('leavePeriodId is required');
    }
    
    // Debug log (handle BigInt)
    console.log('Create leave type data:', {
      ...data,
      leavePeriodId: leavePeriodId?.toString()
    });
    
    // Build VALUES string safely
    const valueParts = [];
    
    // Required fields
    valueParts.push(leavePeriodId); // numeric
    valueParts.push(`'${data.type}'`); // string
    valueParts.push(`'${data.name.replace(/'/g, "''")}'`); // string
    valueParts.push(data.defaultQuota); // numeric
    
    // Optional numeric fields
    valueParts.push(data.maxConsecutiveDays !== undefined && data.maxConsecutiveDays !== null ? data.maxConsecutiveDays : 'NULL');
    valueParts.push(data.advanceNoticeDays !== undefined && data.advanceNoticeDays !== null ? data.advanceNoticeDays : 'NULL');
    
    // Boolean fields (never NULL)
    valueParts.push(data.isCarryForward !== undefined ? data.isCarryForward : false);
    
    // Optional numeric
    valueParts.push(data.maxCarryForward !== undefined && data.maxCarryForward !== null ? data.maxCarryForward : 'NULL');
    
    // Boolean fields
    valueParts.push(data.requiresApproval !== undefined ? data.requiresApproval : true);
    valueParts.push(data.allowNegativeBalance !== undefined ? data.allowNegativeBalance : false);
    
    // Optional string
    valueParts.push(data.description !== undefined && data.description !== null ? `'${data.description.replace(/'/g, "''")}'` : 'NULL');
    
    // Final fields
    valueParts.push(data.isActive !== undefined ? data.isActive : true);
    valueParts.push('NOW()');
    valueParts.push('NOW()');
    
    const query = `
      INSERT INTO "leave_type_config" (
        "leavePeriodId", type, name, "defaultQuota", "maxConsecutiveDays", 
        "advanceNoticeDays", "isCarryForward", "maxCarryForward", 
        "requiresApproval", "allowNegativeBalance", description, "isActive", 
        "createdAt", "updatedAt"
      )
      VALUES (${valueParts.join(', ')})
      RETURNING *
    `;
    
    console.log('Generated query:', query);
    const result = await client.$queryRawUnsafe(query);
    
    return result[0];
  }

  async findAll(tenantSlug: string, params?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }) {
    const { skip, take, where, orderBy } = params || {};
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    // Build WHERE clause
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.leavePeriodId !== undefined) {
        conditions.push(`ltc."leavePeriodId" = ${where.leavePeriodId}`);
      }
      if (where.isActive !== undefined) {
        conditions.push(`ltc."isActive" = ${where.isActive}`);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    // Build ORDER BY clause
    let orderByClause = 'ORDER BY ltc."createdAt" DESC';
    if (orderBy) {
      const orderParts = [];
      for (const [field, direction] of Object.entries(orderBy)) {
        orderParts.push(`ltc."${field}" ${direction === 'asc' ? 'ASC' : 'DESC'}`);
      }
      if (orderParts.length > 0) {
        orderByClause = 'ORDER BY ' + orderParts.join(', ');
      }
    }
    
    // Build LIMIT/OFFSET
    let limitClause = '';
    if (take !== undefined) {
      limitClause = `LIMIT ${take}`;
    }
    if (skip !== undefined) {
      limitClause += ` OFFSET ${skip}`;
    }
    
    const query = `
      SELECT 
        ltc.*,
        lp.id as "leavePeriod_id",
        lp.name as "leavePeriod_name",
        lp."isActive" as "leavePeriod_isActive",
        (SELECT COUNT(*) FROM leave_balance lb WHERE lb."leaveTypeConfigId" = ltc.id) as "balances_count",
        (SELECT COUNT(*) FROM leave_request lr WHERE lr."leaveTypeConfigId" = ltc.id) as "requests_count"
      FROM leave_type_config ltc
      LEFT JOIN leave_period lp ON lp.id = ltc."leavePeriodId"
      ${whereClause}
      ${orderByClause}
      ${limitClause}
    `;
    
    const results = await client.$queryRawUnsafe(query);
    
    // Transform results to match expected format
    return results.map((row: any) => ({
      ...row,
      leavePeriod: {
        id: row.leavePeriod_id,
        name: row.leavePeriod_name,
        isActive: row.leavePeriod_isActive
      },
      _count: {
        leaveBalances: Number(row.balances_count),
        leaveRequests: Number(row.requests_count)
      }
    }));
  }

  async findById(tenantSlug: string, id: number) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      SELECT 
        ltc.*,
        row_to_json(lp.*) as "leavePeriod"
      FROM leave_type_config ltc
      LEFT JOIN leave_period lp ON lp.id = ltc."leavePeriodId"
      WHERE ltc.id = ${id}
    `;
    
    const results = await client.$queryRawUnsafe(query);
    return results[0] || null;
  }

  async findByPeriod(tenantSlug: string, leavePeriodId: bigint, activeOnly = false) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const activeCondition = activeOnly ? 'AND ltc."isActive" = true' : '';
    
    const query = `
      SELECT 
        ltc.*,
        (SELECT COUNT(*) FROM leave_balance lb WHERE lb."leaveTypeConfigId" = ltc.id) as "balances_count",
        (SELECT COUNT(*) FROM leave_request lr WHERE lr."leaveTypeConfigId" = ltc.id) as "requests_count"
      FROM leave_type_config ltc
      WHERE ltc."leavePeriodId" = ${leavePeriodId}
      ${activeCondition}
    `;
    
    const results = await client.$queryRawUnsafe(query);
    
    return results.map((row: any) => ({
      ...row,
      _count: {
        leaveBalances: Number(row.balances_count),
        leaveRequests: Number(row.requests_count)
      }
    }));
  }

  async findByTypeAndPeriod(tenantSlug: string, type: string, leavePeriodId: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      SELECT * FROM leave_type_config
      WHERE type = '${type}'
      AND "leavePeriodId" = ${leavePeriodId}
      AND "isActive" = true
      LIMIT 1
    `;
    
    const results = await client.$queryRawUnsafe(query);
    return results[0] || null;
  }

  async update(tenantSlug: string, id: number, data: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const updates = [];
    if (data.type !== undefined) updates.push(`type = '${data.type}'`);
    if (data.name !== undefined) updates.push(`name = '${data.name.replace(/'/g, "''")}' `);
    if (data.defaultQuota !== undefined) updates.push(`"defaultQuota" = ${data.defaultQuota}`);
    if (data.maxConsecutiveDays !== undefined) {
      updates.push(`"maxConsecutiveDays" = ${data.maxConsecutiveDays !== null ? data.maxConsecutiveDays : 'NULL'}`);
    }
    if (data.advanceNoticeDays !== undefined) {
      updates.push(`"advanceNoticeDays" = ${data.advanceNoticeDays !== null ? data.advanceNoticeDays : 'NULL'}`);
    }
    if (data.isCarryForward !== undefined) updates.push(`"isCarryForward" = ${data.isCarryForward}`);
    if (data.maxCarryForward !== undefined) {
      updates.push(`"maxCarryForward" = ${data.maxCarryForward !== null ? data.maxCarryForward : 'NULL'}`);
    }
    if (data.requiresApproval !== undefined) updates.push(`"requiresApproval" = ${data.requiresApproval}`);
    if (data.allowNegativeBalance !== undefined) updates.push(`"allowNegativeBalance" = ${data.allowNegativeBalance}`);
    if (data.description !== undefined) {
      updates.push(`description = ${data.description !== null ? `'${data.description.replace(/'/g, "''")}' ` : 'NULL'}`);
    }
    if (data.isActive !== undefined) updates.push(`"isActive" = ${data.isActive}`);
    
    updates.push(`"updatedAt" = NOW()`);
    
    const query = `
      UPDATE leave_type_config
      SET ${updates.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async delete(tenantSlug: string, id: number) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      DELETE FROM leave_type_config
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async isUsedInBalancesOrRequests(tenantSlug: string, id: number): Promise<boolean> {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM leave_balance WHERE "leaveTypeConfigId" = ${id}) as balance_count,
        (SELECT COUNT(*) FROM leave_request WHERE "leaveTypeConfigId" = ${id}) as request_count
    `;
    
    const result = await client.$queryRawUnsafe(query);
    const row = result[0] as any;
    
    return Number(row.balance_count) > 0 || Number(row.request_count) > 0;
  }

  async count(tenantSlug: string, where?: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.leavePeriodId !== undefined) {
        conditions.push(`"leavePeriodId" = ${where.leavePeriodId}`);
      }
      if (where.isActive !== undefined) {
        conditions.push(`"isActive" = ${where.isActive}`);
      }
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    const query = `
      SELECT COUNT(*) as count
      FROM leave_type_config
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return Number(result[0].count);
  }
}