import { Injectable } from '@nestjs/common';
import { LeavePrismaService } from '../../../database/leave-prisma.service';

@Injectable()
export class LeaveRequestRepository {
  constructor(private leavePrismaService: LeavePrismaService) {}

  async create(tenantSlug: string, data: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    // Extract IDs from nested connect objects if needed
    const employeeId = data.employeeId || data.employee?.connect?.id;
    const leavePeriodId = data.leavePeriodId || data.leavePeriod?.connect?.id;
    const leaveTypeConfigId = data.leaveTypeConfigId || data.leaveTypeConfig?.connect?.id;
    
    // Validate required fields
    if (!employeeId) throw new Error('employeeId is required');
    if (!leavePeriodId) throw new Error('leavePeriodId is required');
    if (!leaveTypeConfigId) throw new Error('leaveTypeConfigId is required');
    if (!data.totalDays && data.totalDays !== 0) throw new Error('totalDays is required');
    
    const startDateStr = new Date(data.startDate).toISOString().split('T')[0];
    const endDateStr = new Date(data.endDate).toISOString().split('T')[0];
    const reason = data.reason ? `'${data.reason.replace(/'/g, "''")}'` : `''`;
    
    const insertQuery = `
      INSERT INTO leave_request (
        "employeeId", "leavePeriodId", "leaveTypeConfigId",
        "startDate", "endDate", "totalDays", reason, status, "submittedAt"
      )
      VALUES (
        ${employeeId}, ${leavePeriodId}, ${leaveTypeConfigId},
        '${startDateStr}', '${endDateStr}', ${data.totalDays}, ${reason},
        '${data.status || 'PENDING'}', NOW()
      )
      RETURNING id
    `;
    
    const insertResult = await client.$queryRawUnsafe(insertQuery);
    const newId = insertResult[0].id;
    
    // Fetch the complete record with all relations
    const selectQuery = `
      SELECT 
        lr.*,
        row_to_json(e.*) as employee,
        row_to_json(ltc.*) as "leaveTypeConfig",
        row_to_json(lp.*) as "leavePeriod"
      FROM leave_request lr
      LEFT JOIN employees e ON e.id = lr."employeeId"
      LEFT JOIN leave_type_config ltc ON ltc.id = lr."leaveTypeConfigId"
      LEFT JOIN leave_period lp ON lp.id = lr."leavePeriodId"
      WHERE lr.id = ${newId}
    `;
    
    const result = await client.$queryRawUnsafe(selectQuery);
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
      if (where.employeeId !== undefined) conditions.push(`lr."employeeId" = ${where.employeeId}`);
      if (where.leavePeriodId !== undefined) conditions.push(`lr."leavePeriodId" = ${where.leavePeriodId}`);
      if (where.status !== undefined) conditions.push(`lr.status = '${where.status}'`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    let orderByClause = 'ORDER BY lr."submittedAt" DESC';
    if (orderBy) {
      const orderParts = [];
      for (const [field, direction] of Object.entries(orderBy)) {
        orderParts.push(`lr."${field}" ${direction === 'asc' ? 'ASC' : 'DESC'}`);
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
        lr.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position",
        ltc.id as "leaveTypeConfig_id",
        ltc.name as "leaveTypeConfig_name",
        ltc.type as "leaveTypeConfig_type",
        lp.id as "leavePeriod_id",
        lp.name as "leavePeriod_name"
      FROM leave_request lr
      LEFT JOIN employees e ON e.id = lr."employeeId"
      LEFT JOIN leave_type_config ltc ON ltc.id = lr."leaveTypeConfigId"
      LEFT JOIN leave_period lp ON lp.id = lr."leavePeriodId"
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
      leaveTypeConfig: {
        id: row.leaveTypeConfig_id,
        name: row.leaveTypeConfig_name,
        type: row.leaveTypeConfig_type
      },
      leavePeriod: {
        id: row.leavePeriod_id,
        name: row.leavePeriod_name
      }
    }));
  }

  async findById(tenantSlug: string, id: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      SELECT 
        lr.*,
        row_to_json(e.*) as employee,
        row_to_json(ltc.*) as "leaveTypeConfig",
        row_to_json(lp.*) as "leavePeriod"
      FROM leave_request lr
      LEFT JOIN employees e ON e.id = lr."employeeId"
      LEFT JOIN leave_type_config ltc ON ltc.id = lr."leaveTypeConfigId"
      LEFT JOIN leave_period lp ON lp.id = lr."leavePeriodId"
      WHERE lr.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findByEmployee(tenantSlug: string, employeeId: bigint, params?: {
    skip?: number;
    take?: number;
    status?: string;
  }) {
    const { skip = 0, take = 10, status } = params || {};
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const statusCondition = status ? `AND lr.status = '${status}'` : '';
    
    const result = await client.$queryRawUnsafe(`
      SELECT 
        lr.*,
        ltc.id as "leaveTypeConfig_id",
        ltc.name as "leaveTypeConfig_name",
        ltc.type as "leaveTypeConfig_type",
        lp.id as "leavePeriod_id",
        lp.name as "leavePeriod_name"
      FROM "leave_request" lr
      LEFT JOIN "leave_type_config" ltc ON lr."leaveTypeConfigId" = ltc.id
      LEFT JOIN "leave_period" lp ON lr."leavePeriodId" = lp.id
      WHERE lr."employeeId" = ${employeeId} ${statusCondition}
      ORDER BY lr."submittedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `);
    
    return result.map((row: any) => ({
      ...row,
      leaveTypeConfig: {
        id: row.leaveTypeConfig_id,
        name: row.leaveTypeConfig_name,
        type: row.leaveTypeConfig_type,
      },
      leavePeriod: {
        id: row.leavePeriod_id,
        name: row.leavePeriod_name,
      }
    }));
  }

  async findPendingForApprover(tenantSlug: string, approverId: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      SELECT DISTINCT
        lr.*,
        e.id as "employee_id",
        e."firstName" as "employee_firstName",
        e."lastName" as "employee_lastName",
        e.department as "employee_department",
        e.position as "employee_position",
        ltc.id as "leaveTypeConfig_id",
        ltc.name as "leaveTypeConfig_name",
        ltc.type as "leaveTypeConfig_type",
        lp.id as "leavePeriod_id",
        lp.name as "leavePeriod_name"
      FROM leave_request lr
      LEFT JOIN employees e ON e.id = lr."employeeId"
      LEFT JOIN leave_type_config ltc ON ltc.id = lr."leaveTypeConfigId"
      LEFT JOIN leave_period lp ON lp.id = lr."leavePeriodId"
      LEFT JOIN leave_approval la ON la."leaveRequestId" = lr.id
      WHERE (
        (lr.status = 'PENDING' AND e."managerId" = ${approverId})
        OR (la."approverId" = ${approverId} AND la.status = 'PENDING')
      )
      ORDER BY lr."submittedAt" ASC
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
      leaveTypeConfig: {
        id: row.leaveTypeConfig_id,
        name: row.leaveTypeConfig_name,
        type: row.leaveTypeConfig_type
      },
      leavePeriod: {
        id: row.leavePeriod_id,
        name: row.leavePeriod_name
      }
    }));
  }

  async findConflicting(tenantSlug: string, employeeId: bigint, startDate: Date, endDate: Date, excludeId?: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const startDateStr = new Date(startDate).toISOString().split('T')[0];
    const endDateStr = new Date(endDate).toISOString().split('T')[0];
    const excludeCondition = excludeId ? `AND id != ${excludeId}` : '';
    
    const query = `
      SELECT * FROM leave_request
      WHERE "employeeId" = ${employeeId}
        AND status IN ('PENDING', 'MANAGER_APPROVED', 'APPROVED')
        AND "startDate" <= '${endDateStr}'
        AND "endDate" >= '${startDateStr}'
        ${excludeCondition}
    `;
    
    return client.$queryRawUnsafe(query);
  }

  async update(tenantSlug: string, id: bigint, data: any) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const updates = [];
    if (data.status !== undefined) updates.push(`status = '${data.status}'`);
    if (data.rejectionReason !== undefined) {
      updates.push(`"rejectionReason" = ${data.rejectionReason ? `'${data.rejectionReason.replace(/'/g, "''")}'` : 'NULL'}`);
    }
    if (data.managerComments !== undefined) {
      updates.push(`"managerComments" = ${data.managerComments ? `'${data.managerComments.replace(/'/g, "''")}'` : 'NULL'}`);
    }
    if (data.hrComments !== undefined) {
      updates.push(`"hrComments" = ${data.hrComments ? `'${data.hrComments.replace(/'/g, "''")}'` : 'NULL'}`);
    }
    if (data.managerApprovedAt !== undefined) updates.push(`"managerApprovedAt" = ${data.managerApprovedAt ? `'${new Date(data.managerApprovedAt).toISOString()}'` : 'NULL'}`);
    if (data.hrApprovedAt !== undefined) updates.push(`"hrApprovedAt" = ${data.hrApprovedAt ? `'${new Date(data.hrApprovedAt).toISOString()}'` : 'NULL'}`);
    if (data.finalizedAt !== undefined) updates.push(`"finalizedAt" = ${data.finalizedAt ? `'${new Date(data.finalizedAt).toISOString()}'` : 'NULL'}`);
    
    const query = `
      UPDATE leave_request
      SET ${updates.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async delete(tenantSlug: string, id: bigint) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    
    const query = `
      DELETE FROM leave_request
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
      if (where.status !== undefined) conditions.push(`status = '${where.status}'`);
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
    }
    
    const query = `
      SELECT COUNT(*) as count
      FROM leave_request
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return Number(result[0].count);
  }

  async approveRequest(tenantSlug: string, id: bigint, approverId: bigint, comments?: string, level?: 'MANAGER' | 'HR') {
    const client = this.leavePrismaService.getClient(tenantSlug);
    return client.$transaction(async (tx: any) => {
      // Update the leave request status
      const updateData: any = {
        status: level === 'HR' ? 'APPROVED' : (level === 'MANAGER' ? 'MANAGER_APPROVED' : 'APPROVED'),
        ...(level === 'MANAGER' && { 
          managerComments: comments,
          managerApprovedAt: new Date()
        }),
        ...(level === 'HR' && { 
          hrComments: comments,
          hrApprovedAt: new Date(),
          finalizedAt: new Date()
        })
      };

      const updatedRequest = await tx.leaveRequest.update({
        where: { id },
        data: updateData
      });

      // Create approval record
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId,
          approverType: level || 'MANAGER',
          status: 'APPROVED',
          comments,
          approvedAt: new Date()
        }
      });

      return updatedRequest;
    });
  }

  async rejectRequest(tenantSlug: string, id: bigint, approverId: bigint, rejectionReason: string, comments?: string) {
    const client = this.leavePrismaService.getClient(tenantSlug);
    return client.$transaction(async (tx: any) => {
      // Update the leave request status
      const updatedRequest = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          managerComments: comments,
          managerApprovedAt: new Date(),
          finalizedAt: new Date()
        }
      });

      // Create approval record
      await tx.leaveApproval.create({
        data: {
          leaveRequestId: id,
          approverId,
          approverType: 'MANAGER',
          status: 'REJECTED',
          comments: rejectionReason,
          approvedAt: new Date()
        }
      });

      return updatedRequest;
    });
  }
}