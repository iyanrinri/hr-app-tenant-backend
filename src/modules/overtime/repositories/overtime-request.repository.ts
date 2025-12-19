import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '../../../database/multi-tenant-prisma.service';

@Injectable()
export class OvertimeRequestRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any): Promise<any> {
    const client = this.prisma.getClient(tenantSlug);
    
    // Extract IDs from Prisma-style connect objects if present
    const employeeId = data.employee?.connect?.id || data.employeeId;
    const attendanceId = data.attendance?.connect?.id || data.attendanceId || null;
    
    // Handle date objects and strings
    const dateStr = data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date;
    const startTimeStr = data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime;
    const endTimeStr = data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime;
    const submittedAtStr = data.submittedAt ? (data.submittedAt instanceof Date ? data.submittedAt.toISOString() : data.submittedAt) : new Date().toISOString();
    
    const query = `
      INSERT INTO overtime_request (
        "employeeId", "attendanceId", date, "startTime", "endTime",
        "totalMinutes", reason, status, "overtimeRate", "calculatedAmount",
        "managerComments", "hrComments", "rejectionReason", "submittedAt",
        "createdAt", "updatedAt"
      ) VALUES (
        ${employeeId},
        ${attendanceId},
        '${dateStr}',
        '${startTimeStr}',
        '${endTimeStr}',
        ${data.totalMinutes},
        '${data.reason.replace(/'/g, "''")}',
        '${data.status || 'PENDING'}'::"OvertimeStatus",
        ${data.overtimeRate || 'NULL'},
        ${data.calculatedAmount || 'NULL'},
        ${data.managerComments ? `'${data.managerComments.replace(/'/g, "''")}'` : 'NULL'},
        ${data.hrComments ? `'${data.hrComments.replace(/'/g, "''")}'` : 'NULL'},
        ${data.rejectionReason ? `'${data.rejectionReason.replace(/'/g, "''")}'` : 'NULL'},
        '${submittedAtStr}',
        NOW(),
        NOW()
      )
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
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
    const client = this.prisma.getClient(tenantSlug);
    const { skip = 0, take = 20, orderBy } = params;
    
    const orderByClause = orderBy?.submittedAt === 'desc' 
      ? 'ORDER BY ot."submittedAt" DESC'
      : orderBy?.submittedAt === 'asc'
      ? 'ORDER BY ot."submittedAt" ASC'
      : orderBy?.date === 'desc'
      ? 'ORDER BY ot.date DESC'
      : 'ORDER BY ot."submittedAt" DESC';
    
    const query = `
      SELECT 
        ot.*,
        json_build_object(
          'id', e.id,
          'firstName', e."firstName",
          'lastName', e."lastName",
          'position', e.position,
          'department', e.department
        ) as employee,
        CASE 
          WHEN a.id IS NOT NULL THEN json_build_object(
            'id', a.id,
            'date', a.date,
            'checkIn', a."checkIn",
            'checkOut', a."checkOut",
            'workDuration', a."workDuration"
          )
          ELSE NULL
        END as attendance,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oa.id,
                'status', oa.status,
                'comments', oa.comments,
                'approvedAt', oa."approvedAt",
                'approverType', oa."approverType",
                'approver', json_build_object(
                  'id', ap.id,
                  'firstName', ap."firstName",
                  'lastName', ap."lastName",
                  'position', ap.position,
                  'department', ap.department
                )
              )
            )
            FROM overtime_approval oa
            LEFT JOIN employees ap ON ap.id = oa."approverId"
            WHERE oa."overtimeRequestId" = ot.id
          ),
          '[]'::json
        ) as approvals
      FROM overtime_request ot
      LEFT JOIN employees e ON e.id = ot."employeeId"
      LEFT JOIN attendance a ON a.id = ot."attendanceId"
      ${orderByClause}
      LIMIT ${take} OFFSET ${skip}
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async findUnique(
    tenantSlug: string,
    where: any,
    include?: any
  ): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    const id = where.id;
    
    const query = `
      SELECT 
        ot.*,
        json_build_object(
          'id', e.id,
          'firstName', e."firstName",
          'lastName', e."lastName",
          'position', e.position,
          'department', e.department
        ) as employee,
        CASE 
          WHEN a.id IS NOT NULL THEN json_build_object(
            'id', a.id,
            'date', a.date,
            'checkIn', a."checkIn",
            'checkOut', a."checkOut",
            'workDuration', a."workDuration"
          )
          ELSE NULL
        END as attendance,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oa.id,
                'status', oa.status,
                'comments', oa.comments,
                'approvedAt', oa."approvedAt",
                'approverType', oa."approverType",
                'approver', json_build_object(
                  'id', ap.id,
                  'firstName', ap."firstName",
                  'lastName', ap."lastName",
                  'position', ap.position,
                  'department', ap.department
                )
              )
            )
            FROM overtime_approval oa
            LEFT JOIN employees ap ON ap.id = oa."approverId"
            WHERE oa."overtimeRequestId" = ot.id
          ),
          '[]'::json
        ) as approvals
      FROM overtime_request ot
      LEFT JOIN employees e ON e.id = ot."employeeId"
      LEFT JOIN attendance a ON a.id = ot."attendanceId"
      WHERE ot.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findByEmployee(
    tenantSlug: string,
    employeeId: bigint, params?: {
    skip?: number;
    take?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    const { skip = 0, take = 20, status, startDate, endDate } = params || {};

    let whereClause = `WHERE ot."employeeId" = ${employeeId}`;
    
    if (status) {
      whereClause += ` AND ot.status = '${status}'::"OvertimeStatus"`;
    }
    
    if (startDate && endDate) {
      whereClause += ` AND ot.date BETWEEN '${startDate.toISOString().split('T')[0]}' AND '${endDate.toISOString().split('T')[0]}'`;
    }

    const query = `
      SELECT 
        ot.*,
        json_build_object(
          'id', e.id,
          'firstName', e."firstName",
          'lastName', e."lastName",
          'position', e.position,
          'department', e.department
        ) as employee,
        CASE 
          WHEN a.id IS NOT NULL THEN json_build_object(
            'id', a.id,
            'date', a.date,
            'checkIn', a."checkIn",
            'checkOut', a."checkOut",
            'workDuration', a."workDuration"
          )
          ELSE NULL
        END as attendance,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oa.id,
                'status', oa.status,
                'comments', oa.comments,
                'approvedAt', oa."approvedAt",
                'approverType', oa."approverType",
                'approver', json_build_object(
                  'id', ap.id,
                  'firstName', ap."firstName",
                  'lastName', ap."lastName",
                  'position', ap.position,
                  'department', ap.department
                )
              )
            )
            FROM overtime_approval oa
            LEFT JOIN employees ap ON ap.id = oa."approverId"
            WHERE oa."overtimeRequestId" = ot.id
          ),
          '[]'::json
        ) as approvals
      FROM overtime_request ot
      LEFT JOIN employees e ON e.id = ot."employeeId"
      LEFT JOIN attendance a ON a.id = ot."attendanceId"
      ${whereClause}
      ORDER BY ot."submittedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async findPendingRequests(
    tenantSlug: string,
    params?: {
    skip?: number;
    take?: number;
    managerId?: bigint;
  }): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    const { skip = 0, take = 20, managerId } = params || {};

    let whereClause = `WHERE ot.status IN ('PENDING', 'MANAGER_APPROVED')`;
    
    if (managerId) {
      whereClause += ` AND e."managerId" = ${managerId}`;
    }

    const query = `
      SELECT 
        ot.*,
        json_build_object(
          'id', e.id,
          'firstName', e."firstName",
          'lastName', e."lastName",
          'position', e.position,
          'department', e.department,
          'managerId', e."managerId"
        ) as employee,
        CASE 
          WHEN a.id IS NOT NULL THEN json_build_object(
            'id', a.id,
            'date', a.date,
            'checkIn', a."checkIn",
            'checkOut', a."checkOut",
            'workDuration', a."workDuration"
          )
          ELSE NULL
        END as attendance,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', oa.id,
                'status', oa.status,
                'comments', oa.comments,
                'approvedAt', oa."approvedAt",
                'approverType', oa."approverType",
                'approver', json_build_object(
                  'id', ap.id,
                  'firstName', ap."firstName",
                  'lastName', ap."lastName",
                  'position', ap.position,
                  'department', ap.department
                )
              )
            )
            FROM overtime_approval oa
            LEFT JOIN employees ap ON ap.id = oa."approverId"
            WHERE oa."overtimeRequestId" = ot.id
          ),
          '[]'::json
        ) as approvals
      FROM overtime_request ot
      LEFT JOIN employees e ON e.id = ot."employeeId"
      LEFT JOIN attendance a ON a.id = ot."attendanceId"
      ${whereClause}
      ORDER BY ot."submittedAt" ASC
      LIMIT ${take} OFFSET ${skip}
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async findByDateRange(
    tenantSlug: string,
    startDate: Date,
    endDate: Date,
    employeeId?: bigint
  ): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);

    let whereClause = `WHERE ot.date BETWEEN '${startDate.toISOString().split('T')[0]}' AND '${endDate.toISOString().split('T')[0]}'`;
    
    if (employeeId) {
      whereClause += ` AND ot."employeeId" = ${employeeId}`;
    }

    const query = `
      SELECT 
        ot.*,
        json_build_object(
          'id', e.id,
          'firstName', e."firstName",
          'lastName', e."lastName",
          'position', e.position,
          'department', e.department
        ) as employee,
        CASE 
          WHEN a.id IS NOT NULL THEN json_build_object(
            'id', a.id,
            'date', a.date,
            'checkIn', a."checkIn",
            'checkOut', a."checkOut",
            'workDuration', a."workDuration"
          )
          ELSE NULL
        END as attendance
      FROM overtime_request ot
      LEFT JOIN employees e ON e.id = ot."employeeId"
      LEFT JOIN attendance a ON a.id = ot."attendanceId"
      ${whereClause}
      ORDER BY ot.date DESC
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async checkExistingRequest(
    tenantSlug: string,
    employeeId: bigint,
    date: Date
  ): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT *
      FROM overtime_request
      WHERE "employeeId" = ${employeeId}
        AND date = '${date.toISOString().split('T')[0]}'
        AND status NOT IN ('REJECTED', 'CANCELLED')
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findAttendanceByDate(
    tenantSlug: string,
    employeeId: bigint,
    date: Date
  ): Promise<{ id: bigint } | null> {
    const client = this.prisma.getClient(tenantSlug);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = `
      SELECT id
      FROM attendance
      WHERE "employeeId" = ${employeeId}
        AND date BETWEEN '${startOfDay.toISOString()}' AND '${endOfDay.toISOString()}'
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async update(
    tenantSlug: string,
    where: any,
    data: any
  ): Promise<any> {
    const client = this.prisma.getClient(tenantSlug);
    const id = where.id;
    
    const setClauses: string[] = [];
    
    // Basic request fields
    if (data.employeeId !== undefined) setClauses.push(`"employeeId" = ${data.employeeId}`);
    if (data.date !== undefined) {
      const dateStr = data.date instanceof Date ? data.date.toISOString().split('T')[0] : data.date;
      setClauses.push(`date = '${dateStr}'`);
    }
    if (data.startTime !== undefined) {
      const startTimeStr = data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime;
      setClauses.push(`"startTime" = '${startTimeStr}'`);
    }
    if (data.endTime !== undefined) {
      const endTimeStr = data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime;
      setClauses.push(`"endTime" = '${endTimeStr}'`);
    }
    if (data.totalMinutes !== undefined) setClauses.push(`"totalMinutes" = ${data.totalMinutes}`);
    if (data.reason !== undefined) setClauses.push(`reason = '${data.reason.replace(/'/g, "''")}'`);
    
    // Status and workflow fields
    if (data.status !== undefined) setClauses.push(`status = '${data.status}'::"OvertimeStatus"`);
    if (data.overtimeRate !== undefined) setClauses.push(`"overtimeRate" = ${data.overtimeRate}`);
    if (data.calculatedAmount !== undefined) setClauses.push(`"calculatedAmount" = ${data.calculatedAmount}`);
    if (data.managerComments !== undefined) setClauses.push(`"managerComments" = ${data.managerComments ? `'${data.managerComments.replace(/'/g, "''")}'` : 'NULL'}`);
    if (data.hrComments !== undefined) setClauses.push(`"hrComments" = ${data.hrComments ? `'${data.hrComments.replace(/'/g, "''")}'` : 'NULL'}`);
    if (data.rejectionReason !== undefined) setClauses.push(`"rejectionReason" = ${data.rejectionReason ? `'${data.rejectionReason.replace(/'/g, "''")}'` : 'NULL'}`);
    if (data.managerApprovedAt !== undefined) setClauses.push(`"managerApprovedAt" = ${data.managerApprovedAt ? `'${data.managerApprovedAt.toISOString()}'` : 'NULL'}`);
    if (data.hrApprovedAt !== undefined) setClauses.push(`"hrApprovedAt" = ${data.hrApprovedAt ? `'${data.hrApprovedAt.toISOString()}'` : 'NULL'}`);
    if (data.finalizedAt !== undefined) setClauses.push(`"finalizedAt" = ${data.finalizedAt ? `'${data.finalizedAt.toISOString()}'` : 'NULL'}`);
    
    setClauses.push(`"updatedAt" = NOW()`);
    
    const setClause = setClauses.join(', ');
    
    const query = `
      UPDATE overtime_request
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
      DELETE FROM overtime_request
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async count(
    tenantSlug: string,
    where?: any): Promise<number> {
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (where?.employeeId) {
      whereClause = `WHERE "employeeId" = ${where.employeeId}`;
    }
    if (where?.status) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `status = '${where.status}'::"OvertimeStatus"`;
    }
    
    const query = `
      SELECT COUNT(*)::int as count
      FROM overtime_request
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0]?.count || 0;
  }

  async getTotalOvertimeMinutes(
    tenantSlug: string,
    employeeId: bigint,
    startDate: Date,
    endDate: Date,
    status?: string
  ): Promise<number> {
    const client = this.prisma.getClient(tenantSlug);

    let whereClause = `
      WHERE "employeeId" = ${employeeId}
        AND date BETWEEN '${startDate.toISOString().split('T')[0]}' AND '${endDate.toISOString().split('T')[0]}'
    `;
    
    if (status) {
      whereClause += ` AND status = '${status}'::"OvertimeStatus"`;
    }

    const query = `
      SELECT COALESCE(SUM("totalMinutes"), 0)::int as total
      FROM overtime_request
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0]?.total || 0;
  }

  async getEmployeeIdByUserId(tenantSlug: string, userId: bigint): Promise<bigint | null> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT id
      FROM employees
      WHERE "userId" = ${userId}
      LIMIT 1
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0]?.id || null;
  }
}
