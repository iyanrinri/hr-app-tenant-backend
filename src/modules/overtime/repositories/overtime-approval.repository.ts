import { Injectable } from '@nestjs/common';
import { MultiTenantPrismaService } from '../../../database/multi-tenant-prisma.service';

@Injectable()
export class OvertimeApprovalRepository {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, data: any) {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      INSERT INTO overtime_approval (
        "overtimeRequestId", "approverId", "approverType", status,
        comments, "approvedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${data.overtimeRequestId},
        ${data.approverId},
        '${data.approverType}',
        '${data.status || 'PENDING'}'::"ApprovalStatus",
        ${data.comments ? `'${data.comments.replace(/'/g, "''")}'` : 'NULL'},
        ${data.approvedAt ? `'${data.approvedAt.toISOString()}'` : 'NULL'},
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
    const { skip = 0, take = 20 } = params;
    
    const query = `
      SELECT 
        oa.*,
        json_build_object(
          'id', ap.id,
          'firstName', ap."firstName",
          'lastName', ap."lastName",
          'position', ap.position,
          'department', ap.department
        ) as approver,
        json_build_object(
          'id', ot.id,
          'employeeId', ot."employeeId",
          'date', ot.date,
          'reason', ot.reason,
          'status', ot.status
        ) as "overtimeRequest"
      FROM overtime_approval oa
      LEFT JOIN employees ap ON ap.id = oa."approverId"
      LEFT JOIN overtime_request ot ON ot.id = oa."overtimeRequestId"
      ORDER BY oa."createdAt" DESC
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
        oa.*,
        json_build_object(
          'id', ap.id,
          'firstName', ap."firstName",
          'lastName', ap."lastName",
          'position', ap.position,
          'department', ap.department
        ) as approver,
        json_build_object(
          'id', ot.id,
          'employeeId', ot."employeeId",
          'date', ot.date,
          'reason', ot.reason,
          'status', ot.status
        ) as "overtimeRequest"
      FROM overtime_approval oa
      LEFT JOIN employees ap ON ap.id = oa."approverId"
      LEFT JOIN overtime_request ot ON ot.id = oa."overtimeRequestId"
      WHERE oa.id = ${id}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0] || null;
  }

  async findByRequest(tenantSlug: string, overtimeRequestId: bigint): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT 
        oa.*,
        json_build_object(
          'id', ap.id,
          'firstName', ap."firstName",
          'lastName', ap."lastName",
          'position', ap.position,
          'department', ap.department
        ) as approver,
        json_build_object(
          'id', ot.id,
          'employeeId', ot."employeeId",
          'date', ot.date,
          'reason', ot.reason,
          'status', ot.status
        ) as "overtimeRequest"
      FROM overtime_approval oa
      LEFT JOIN employees ap ON ap.id = oa."approverId"
      LEFT JOIN overtime_request ot ON ot.id = oa."overtimeRequestId"
      WHERE oa."overtimeRequestId" = ${overtimeRequestId}
      ORDER BY oa."createdAt" ASC
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async findByApprover(
    tenantSlug: string,
    approverId: bigint,
    params?: {
      skip?: number;
      take?: number;
      status?: string;
      approverType?: string;
    }
  ): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);
    const { skip = 0, take = 20, status, approverType } = params || {};

    let whereClause = `WHERE oa."approverId" = ${approverId}`;
    
    if (status) {
      whereClause += ` AND oa.status = '${status}'::"ApprovalStatus"`;
    }
    
    if (approverType) {
      whereClause += ` AND oa."approverType" = '${approverType}'`;
    }

    const query = `
      SELECT 
        oa.*,
        json_build_object(
          'id', ap.id,
          'firstName', ap."firstName",
          'lastName', ap."lastName",
          'position', ap.position,
          'department', ap.department
        ) as approver,
        json_build_object(
          'id', ot.id,
          'employeeId', ot."employeeId",
          'date', ot.date,
          'reason', ot.reason,
          'status', ot.status,
          'employee', json_build_object(
            'id', e.id,
            'firstName', e."firstName",
            'lastName', e."lastName",
            'position', e.position,
            'department', e.department
          )
        ) as "overtimeRequest"
      FROM overtime_approval oa
      LEFT JOIN employees ap ON ap.id = oa."approverId"
      LEFT JOIN overtime_request ot ON ot.id = oa."overtimeRequestId"
      LEFT JOIN employees e ON e.id = ot."employeeId"
      ${whereClause}
      ORDER BY oa."createdAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async findPendingApprovals(
    tenantSlug: string,
    approverId?: bigint,
    approverType?: string
  ): Promise<any[]> {
    const client = this.prisma.getClient(tenantSlug);

    let whereClause = `WHERE oa.status = 'PENDING'::"ApprovalStatus"`;
    
    if (approverId) {
      whereClause += ` AND oa."approverId" = ${approverId}`;
    }
    
    if (approverType) {
      whereClause += ` AND oa."approverType" = '${approverType}'`;
    }

    const query = `
      SELECT 
        oa.*,
        json_build_object(
          'id', ap.id,
          'firstName', ap."firstName",
          'lastName', ap."lastName",
          'position', ap.position,
          'department', ap.department
        ) as approver,
        json_build_object(
          'id', ot.id,
          'employeeId', ot."employeeId",
          'date', ot.date,
          'reason', ot.reason,
          'status', ot.status,
          'totalMinutes', ot."totalMinutes",
          'startTime', ot."startTime",
          'endTime', ot."endTime",
          'employee', json_build_object(
            'id', e.id,
            'firstName', e."firstName",
            'lastName', e."lastName",
            'position', e.position,
            'department', e.department
          ),
          'attendance', CASE 
            WHEN a.id IS NOT NULL THEN json_build_object(
              'id', a.id,
              'date', a.date,
              'checkIn', a."checkIn",
              'checkOut', a."checkOut",
              'workDuration', a."workDuration"
            )
            ELSE NULL
          END
        ) as "overtimeRequest"
      FROM overtime_approval oa
      LEFT JOIN employees ap ON ap.id = oa."approverId"
      LEFT JOIN overtime_request ot ON ot.id = oa."overtimeRequestId"
      LEFT JOIN employees e ON e.id = ot."employeeId"
      LEFT JOIN attendance a ON a.id = ot."attendanceId"
      ${whereClause}
      ORDER BY oa."createdAt" ASC
    `;
    
    return await client.$queryRawUnsafe(query);
  }

  async findExisting(
    tenantSlug: string,
    overtimeRequestId: bigint,
    approverId: bigint,
    approverType: string
  ): Promise<any | null> {
    const client = this.prisma.getClient(tenantSlug);
    
    const query = `
      SELECT *
      FROM overtime_approval
      WHERE "overtimeRequestId" = ${overtimeRequestId}
        AND "approverId" = ${approverId}
        AND "approverType" = '${approverType}'
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
    
    if (data.status !== undefined) setClauses.push(`status = '${data.status}'::"ApprovalStatus"`);
    if (data.comments !== undefined) setClauses.push(`comments = ${data.comments ? `'${data.comments.replace(/'/g, "''")}'` : 'NULL'}`);
    if (data.approvedAt !== undefined) setClauses.push(`"approvedAt" = ${data.approvedAt ? `'${data.approvedAt.toISOString()}'` : 'NULL'}`);
    
    setClauses.push(`"updatedAt" = NOW()`);
    
    const setClause = setClauses.join(', ');
    
    const query = `
      UPDATE overtime_approval
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
      DELETE FROM overtime_approval
      WHERE id = ${id}
      RETURNING *
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0];
  }

  async count(tenantSlug: string, where?: any): Promise<number> {
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (where?.approverId) {
      whereClause = `WHERE "approverId" = ${where.approverId}`;
    }
    if (where?.status) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `status = '${where.status}'::"ApprovalStatus"`;
    }
    
    const query = `
      SELECT COUNT(*)::int as count
      FROM overtime_approval
      ${whereClause}
    `;
    
    const result = await client.$queryRawUnsafe(query);
    return result[0]?.count || 0;
  }

  async getApprovalStats(tenantSlug: string, approverId?: bigint, startDate?: Date, endDate?: Date) {
    const client = this.prisma.getClient(tenantSlug);

    let whereClause = '';
    
    if (approverId) {
      whereClause = `WHERE "approverId" = ${approverId}`;
    }
    
    if (startDate && endDate) {
      whereClause += whereClause ? ' AND ' : 'WHERE ';
      whereClause += `"createdAt" BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
    }

    const query = `
      SELECT 
        status,
        COUNT(*)::int as count
      FROM overtime_approval
      ${whereClause}
      GROUP BY status
    `;
    
    const result = await client.$queryRawUnsafe(query);

    return result.reduce((acc: Record<string, number>, curr: { status: string; count: number }) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }
}
