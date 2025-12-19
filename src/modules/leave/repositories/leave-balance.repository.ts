import { Injectable } from '@nestjs/common';
import { LeavePrismaService } from '../../../database/leave-prisma.service';

@Injectable()
export class LeaveBalanceRepository {
  constructor(private leavePrismaService: LeavePrismaService) {}

  async create(tenantSlug: string, data: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      INSERT INTO leave_balance (
        "employeeId", "leavePeriodId", "leaveTypeConfigId", 
        "totalQuota", "usedQuota", "remainingQuota"
      )
      VALUES (
        ${data.employeeId}, ${data.leavePeriodId}, ${data.leaveTypeConfigId},
        ${data.totalQuota}, ${data.usedQuota || 0}, ${data.remainingQuota}
      )
      RETURNING *
    `;
    
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
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.employeeId !== undefined) conditions.push(`lb."employeeId" = ${where.employeeId}`);
      if (where.leavePeriodId !== undefined) conditions.push(`lb."leavePeriodId" = ${where.leavePeriodId}`);
      if (where.leaveTypeConfigId !== undefined) conditions.push(`lb."leaveTypeConfigId" = ${where.leaveTypeConfigId}`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    let orderByClause = 'ORDER BY lb.id DESC';
    if (orderBy) {
      const orderParts = [];
      for (const [field, direction] of Object.entries(orderBy)) {
        orderParts.push(`lb."${field}" ${direction === 'asc' ? 'ASC' : 'DESC'}`);
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
        lb.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position",
        lp.id as "leavePeriod_id",
        lp.name as "leavePeriod_name",
        ltc.id as "leaveTypeConfig_id",
        ltc.name as "leaveTypeConfig_name",
        ltc.type as "leaveTypeConfig_type"
      FROM leave_balance lb
      LEFT JOIN employees e ON e.id = lb."employeeId"
      LEFT JOIN leave_period lp ON lp.id = lb."leavePeriodId"
      LEFT JOIN leave_type_config ltc ON ltc.id = lb."leaveTypeConfigId"
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
      },
      leavePeriod: {
        id: row.leavePeriod_id,
        name: row.leavePeriod_name
      },
      leaveTypeConfig: {
        id: row.leaveTypeConfig_id,
        name: row.leaveTypeConfig_name,
        type: row.leaveTypeConfig_type
      }
    }));
  }

  async findByEmployee(tenantSlug: string, employeeId: bigint, leavePeriodId?: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    const periodCondition = leavePeriodId ? `AND lb."leavePeriodId" = ${leavePeriodId}` : '';
    
    const result = await client.$queryRawUnsafe(`
      SELECT 
        lb.*,
        ltc.id as "leaveTypeConfig_id",
        ltc.name as "leaveTypeConfig_name",
        ltc.type as "leaveTypeConfig_type",
        ltc."maxConsecutiveDays" as "leaveTypeConfig_maxConsecutiveDays",
        ltc."advanceNoticeDays" as "leaveTypeConfig_advanceNoticeDays",
        ltc."isCarryForward" as "leaveTypeConfig_isCarryForward",
        ltc."maxCarryForward" as "leaveTypeConfig_maxCarryForward",
        lp.id as "leavePeriod_id",
        lp.name as "leavePeriod_name",
        lp."isActive" as "leavePeriod_isActive"
      FROM "leave_balance" lb
      LEFT JOIN "leave_type_config" ltc ON lb."leaveTypeConfigId" = ltc.id
      LEFT JOIN "leave_period" lp ON lb."leavePeriodId" = lp.id
      WHERE lb."employeeId" = ${employeeId} ${periodCondition}
    `);
    
    return result.map((row: any) => ({
      ...row,
      leaveTypeConfig: {
        id: row.leaveTypeConfig_id,
        name: row.leaveTypeConfig_name,
        type: row.leaveTypeConfig_type,
        maxConsecutiveDays: row.leaveTypeConfig_maxConsecutiveDays,
        advanceNoticeDays: row.leaveTypeConfig_advanceNoticeDays,
        isCarryForward: row.leaveTypeConfig_isCarryForward,
        maxCarryForward: row.leaveTypeConfig_maxCarryForward,
      },
      leavePeriod: {
        id: row.leavePeriod_id,
        name: row.leavePeriod_name,
        isActive: row.leavePeriod_isActive,
      }
    }));
  }

  async findByEmployeeAndType(tenantSlug: string, employeeId: bigint, leaveTypeConfigId: bigint, leavePeriodId?: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    // If leavePeriodId is not provided, get the active period
    let periodId = leavePeriodId;
    if (!periodId) {
      const activePeriod = await this.findActivePeriod(tenantSlug);
      if (!activePeriod) return null;
      periodId = activePeriod.id;
    }
    
    const query = `
      SELECT 
        lb.*,
        row_to_json(ltc.*) as "leaveTypeConfig",
        row_to_json(lp.*) as "leavePeriod"
      FROM leave_balance lb
      LEFT JOIN leave_type_config ltc ON ltc.id = lb."leaveTypeConfigId"
      LEFT JOIN leave_period lp ON lp.id = lb."leavePeriodId"
      WHERE lb."employeeId" = ${employeeId}
        AND lb."leavePeriodId" = ${periodId}
        AND lb."leaveTypeConfigId" = ${leaveTypeConfigId}
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findSpecific(tenantSlug: string, employeeId: bigint, leavePeriodId: bigint, leaveTypeConfigId: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      SELECT 
        lb.*,
        row_to_json(ltc.*) as "leaveTypeConfig",
        row_to_json(lp.*) as "leavePeriod"
      FROM leave_balance lb
      LEFT JOIN leave_type_config ltc ON ltc.id = lb."leaveTypeConfigId"
      LEFT JOIN leave_period lp ON lp.id = lb."leavePeriodId"
      WHERE lb."employeeId" = ${employeeId}
        AND lb."leavePeriodId" = ${leavePeriodId}
        AND lb."leaveTypeConfigId" = ${leaveTypeConfigId}
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async update(tenantSlug: string, id: bigint, data: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const updates = [];
    if (data.totalQuota !== undefined) updates.push(`"totalQuota" = ${data.totalQuota}`);
    if (data.usedQuota !== undefined) updates.push(`"usedQuota" = ${data.usedQuota}`);
    if (data.remainingQuota !== undefined) updates.push(`"remainingQuota" = ${data.remainingQuota}`);
    
    const query = `
      UPDATE leave_balance
      SET ${updates.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async updateSpecific(
    tenantSlug: string,
    employeeId: bigint, 
    leavePeriodId: bigint, 
    leaveTypeConfigId: bigint, 
    data: any
  ) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const updates = [];
    if (data.totalQuota !== undefined) updates.push(`"totalQuota" = ${data.totalQuota}`);
    if (data.usedQuota !== undefined) updates.push(`"usedQuota" = ${data.usedQuota}`);
    if (data.remainingQuota !== undefined) updates.push(`"remainingQuota" = ${data.remainingQuota}`);
    
    const query = `
      UPDATE leave_balance
      SET ${updates.join(', ')}
      WHERE "employeeId" = ${employeeId}
        AND "leavePeriodId" = ${leavePeriodId}
        AND "leaveTypeConfigId" = ${leaveTypeConfigId}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async createOrUpdate(
    tenantSlug: string,
    employeeId: bigint, 
    leavePeriodId: bigint, 
    leaveTypeConfigId: bigint, 
    data: any
  ) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const totalQuota = data.totalQuota !== undefined ? data.totalQuota : 0;
    const usedQuota = data.usedQuota !== undefined ? data.usedQuota : 0;
    const remainingQuota = data.remainingQuota !== undefined ? data.remainingQuota : totalQuota;
    
    const query = `
      INSERT INTO leave_balance (
        "employeeId", "leavePeriodId", "leaveTypeConfigId", 
        "totalQuota", "usedQuota", "remainingQuota"
      )
      VALUES (
        ${employeeId}, ${leavePeriodId}, ${leaveTypeConfigId},
        ${totalQuota}, ${usedQuota}, ${remainingQuota}
      )
      ON CONFLICT ("employeeId", "leavePeriodId", "leaveTypeConfigId")
      DO UPDATE SET
        "totalQuota" = EXCLUDED."totalQuota",
        "usedQuota" = EXCLUDED."usedQuota",
        "remainingQuota" = EXCLUDED."remainingQuota"
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async delete(tenantSlug: string, id: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      DELETE FROM leave_balance
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async count(tenantSlug: string, where?: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    let whereClause = '';
    if (where) {
      const conditions = [];
      if (where.employeeId !== undefined) conditions.push(`"employeeId" = ${where.employeeId}`);
      if (where.leavePeriodId !== undefined) conditions.push(`"leavePeriodId" = ${where.leavePeriodId}`);
      if (where.leaveTypeConfigId !== undefined) conditions.push(`"leaveTypeConfigId" = ${where.leaveTypeConfigId}`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    const query = `
      SELECT COUNT(*) as count
      FROM leave_balance
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return Number(result[0].count);
  }

  async findActivePeriod(tenantSlug: string) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    const result = await client.$queryRaw`
      SELECT * FROM "leave_period" 
      WHERE "isActive" = true 
      ORDER BY "startDate" DESC 
      LIMIT 1
    `;
    return result && result.length > 0 ? result[0] : null;
  }

  async updateQuotas(
    tenantSlug: string,
    employeeId: bigint,
    leavePeriodId: bigint,
    leaveTypeConfigId: bigint,
    usedDays: number
  ) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      UPDATE leave_balance
      SET 
        "usedQuota" = "usedQuota" + ${usedDays},
        "remainingQuota" = "remainingQuota" - ${usedDays}
      WHERE "employeeId" = ${employeeId}
        AND "leavePeriodId" = ${leavePeriodId}
        AND "leaveTypeConfigId" = ${leaveTypeConfigId}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async initializeBalance(
    tenantSlug: string,
    employeeId: bigint,
    leaveTypeConfigId: bigint,
    customQuota?: number
  ) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    // First find the active period
    const activePeriod = await this.findActivePeriod(tenantSlug);
    if (!activePeriod) {
      throw new Error('No active leave period found');
    }

    // Get the leave type config to determine default quota
    const leaveTypeConfigResult = await client.$queryRaw`
      SELECT * FROM "leave_type_config" WHERE id = ${leaveTypeConfigId}
    `;

    if (!leaveTypeConfigResult || leaveTypeConfigResult.length === 0) {
      throw new Error('Leave type config not found');
    }

    const leaveTypeConfig = leaveTypeConfigResult[0];
    const quota = customQuota || leaveTypeConfig.defaultQuota || 0;

    const result = await this.createOrUpdate(
      tenantSlug,
      employeeId,
      activePeriod.id,
      leaveTypeConfigId,
      {
        totalQuota: quota,
        usedQuota: 0
      }
    );

    // Return with includes for consistency
    return this.findSpecific(tenantSlug, employeeId, activePeriod.id, leaveTypeConfigId);
  }
}