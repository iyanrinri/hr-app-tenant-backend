import { Injectable } from '@nestjs/common';
import { AttendancePrismaService } from '../../../database/attendance-prisma.service';

// Tenant schema types (not available in main @prisma/client)
export enum AttendanceType {
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

@Injectable()
export class AttendanceRepository {
  constructor(private attendancePrisma: AttendancePrismaService) {}

  async findTodayAttendance(tenantSlug: string, employeeId: bigint, date: Date) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    const dateStr = date.toISOString().split('T')[0];

    try {
      const query = `
        SELECT * FROM "attendances"
        WHERE "employeeId" = ${employeeId}
          AND DATE("date") = '${dateStr}'::date
        ORDER BY "date" DESC
        LIMIT 1
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0] || null;
    } catch (error: any) {
      if (error?.code === '42P01') {
        console.warn(`[AttendanceRepository] Table attendance does not exist for tenant ${tenantSlug}`);
        return null;
      }
      throw error;
    }
  }

  async createAttendance(tenantSlug: string, data: any) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      const columns = Object.keys(data).map(k => `"${k}"`).join(', ');
      const values = Object.values(data).map(v => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (v instanceof Date) return `'${v.toISOString()}'`;
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return `'${v}'`;
      }).join(', ');

      const query = `
        INSERT INTO "attendances" (${columns})
        VALUES (${values})
        RETURNING *
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0];
    } catch (error) {
      throw error;
    }
  }

  async updateAttendance(tenantSlug: string, params: {
    where: any;
    data: any;
  }) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      const setClause = Object.entries(params.data)
        .map(([key, value]) => {
          if (value === null || value === undefined) return `"${key}" = NULL`;
          if (typeof value === 'string') return `"${key}" = '${value.replace(/'/g, "''")}'`;
          if (value instanceof Date) return `"${key}" = '${value.toISOString()}'`;
          if (typeof value === 'bigint') return `"${key}" = ${value.toString()}`;
          if (typeof value === 'boolean') return `"${key}" = ${value ? 'true' : 'false'}`;
          return `"${key}" = '${value}'`;
        })
        .join(', ');

      const whereClause = `id = ${params.where.id}`;

      const query = `
        UPDATE "attendances"
        SET ${setClause}
        WHERE ${whereClause}
        RETURNING *
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0];
    } catch (error) {
      throw error;
    }
  }

  async createAttendanceLog(tenantSlug: string, data: any) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      const columns = Object.keys(data).map(k => `"${k}"`).join(', ');
      const values = Object.values(data).map(v => {
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (v instanceof Date) return `'${v.toISOString()}'`;
        if (typeof v === 'bigint') return v.toString();
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return `'${v}'`;
      }).join(', ');

      const query = `
        INSERT INTO "attendance_log" (${columns})
        VALUES (${values})
        RETURNING *
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0];
    } catch (error) {
      throw error;
    }
  }

  async findAttendanceHistory(tenantSlug: string, params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      let whereClause = '';
      if (params.where) {
        const conditions: string[] = [];
        if (params.where.employeeId) conditions.push(`"employeeId" = ${params.where.employeeId}`);
        if (params.where.date?.gte) conditions.push(`"date" >= '${params.where.date.gte.toISOString()}'`);
        if (params.where.date?.lte) conditions.push(`"date" <= '${params.where.date.lte.toISOString()}'`);
        if (conditions.length > 0) whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      const orderClause = 'ORDER BY "date" DESC';
      const limitClause = params.take ? `LIMIT ${params.take}` : '';
      const offsetClause = params.skip ? `OFFSET ${params.skip}` : '';

      const query = `
        SELECT * FROM "attendances"
        ${whereClause}
        ${orderClause}
        ${limitClause}
        ${offsetClause}
      `;
      const result = await client.$queryRawUnsafe(query);
      return result as any[];
    } catch (error: any) {
      if (error?.code === '42P01') {
        console.warn(`[AttendanceRepository] Table attendance does not exist for tenant ${tenantSlug}`);
        return [];
      }
      throw error;
    }
  }

  async countAttendance(tenantSlug: string, where?: any) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      let whereClause = '';
      if (where) {
        const conditions: string[] = [];
        if (where.employeeId) conditions.push(`"employeeId" = ${where.employeeId}`);
        if (where.date?.gte) conditions.push(`"date" >= '${where.date.gte.toISOString()}'`);
        if (where.date?.lte) conditions.push(`"date" <= '${where.date.lte.toISOString()}'`);
        if (conditions.length > 0) whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      const query = `
        SELECT COUNT(*)::int as count FROM "attendances"
        ${whereClause}
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0]?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  async findAttendanceLogs(tenantSlug: string, params: {
    where?: any;
    orderBy?: any;
    take?: number;
  }) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      let whereClause = '';
      if (params.where) {
        const conditions: string[] = [];
        if (params.where.employeeId) conditions.push(`"employeeId" = ${params.where.employeeId}`);
        if (params.where.timestamp?.gte) conditions.push(`timestamp >= '${params.where.timestamp.gte.toISOString()}'::timestamp`);
        if (params.where.timestamp?.lte) conditions.push(`timestamp <= '${params.where.timestamp.lte.toISOString()}'::timestamp`);
        if (conditions.length > 0) whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      const orderClause = 'ORDER BY timestamp DESC';
      const limitClause = params.take ? `LIMIT ${params.take}` : '';

      const query = `
        SELECT * FROM "attendance_log"
        ${whereClause}
        ${orderClause}
        ${limitClause}
      `;
      const result = await client.$queryRawUnsafe(query);
      return result as any[];
    } catch (error) {
      return [];
    }
  }

  async getLatestLog(tenantSlug: string, employeeId: bigint, date: Date, type?: AttendanceType) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    const dateStr = date.toISOString().split('T')[0];

    try {
      let typeClause = type ? `AND type = '${type}'` : '';
      const query = `
        SELECT * FROM "attendance_log"
        WHERE "employeeId" = ${employeeId}
          AND DATE(timestamp) = '${dateStr}'::date
          ${typeClause}
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0] || null;
    } catch (error) {
      return null;
    }
  }

  async findAttendanceWithLogs(tenantSlug: string, attendanceId: bigint) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      const query = `
        SELECT * FROM "attendances"
        WHERE id = ${attendanceId}
        LIMIT 1
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0] || null;
    } catch (error) {
      return null;
    }
  }

  async getAttendanceStats(tenantSlug: string, employeeId: bigint, startDate: Date, endDate: Date) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    
    if (!client) {
      throw new Error(`Failed to get Prisma client for tenant: ${tenantSlug}`);
    }

    try {
      // Get status counts using raw SQL
      const statsQuery = `
        SELECT status, COUNT(*) as count
        FROM "attendances"
        WHERE "employeeId" = ${employeeId}
          AND "date" >= '${startDate.toISOString()}'::date
          AND "date" <= '${endDate.toISOString()}'::date
        GROUP BY status
      `;
      const stats = await client.$queryRawUnsafe(statsQuery);

      // Get total work duration using raw SQL
      const durationQuery = `
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM ("checkOut" - "checkIn"))/60), 0) as total
        FROM "attendances"
        WHERE "employeeId" = ${employeeId}
          AND "date" >= '${startDate.toISOString()}'::date
          AND "date" <= '${endDate.toISOString()}'::date
          AND "checkIn" IS NOT NULL
          AND "checkOut" IS NOT NULL
      `;
      const durationResult = await client.$queryRawUnsafe(durationQuery);

      // Transform stats to expected format
      const statusCounts: Record<string, number> = {};
      (stats as any[]).forEach((row: any) => {
        statusCounts[row.status] = Number(row.count);
      });

      return {
        statusCounts,
        totalWorkDuration: Number((durationResult as any[])[0]?.total || 0),
      };
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      return {
        statusCounts: {},
        totalWorkDuration: 0,
      };
    }
  }

  async findEmployeeById(tenantSlug: string, employeeId: number) {
    const prisma = this.attendancePrisma.getClient(tenantSlug);
    const client = this.attendancePrisma.getClient(tenantSlug);
    try {
      const query = `
        SELECT e.id, e."firstName", e."lastName", e.position, e.department, u.email
        FROM "employees" e
        LEFT JOIN "users" u ON e."userId" = u.id
        WHERE e.id = ${employeeId}
        LIMIT 1
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0] || null;
    } catch (error) {
      return null;
    }
  }

  async getDashboardData(tenantSlug: string, date: Date, attendancePeriodId: number) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    const dateStr = date.toISOString().split('T')[0];

    try {
      // Get all active employees using raw SQL
      const employeesQuery = `
        SELECT e.*, u.email, u.role
        FROM "employees" e
        LEFT JOIN "users" u ON e."userId" = u.id
        WHERE e."deletedAt" IS NULL AND e."isActive" = true
      `;
      const allEmployees = await client.$queryRawUnsafe(employeesQuery);

      // Get today's attendance records with employee data using raw SQL
      const attendanceQuery = `
        SELECT 
          a.*,
          e.id as "employee_id",
          e."firstName" as "employee_firstName",
          e."lastName" as "employee_lastName",
          e.department as "employee_department",
          e.position as "employee_position",
          u.email as "employee_email"
        FROM "attendances" a
        LEFT JOIN "employees" e ON a."employeeId" = e.id
        LEFT JOIN "users" u ON e."userId" = u.id
        WHERE a."date" = '${dateStr}'::date
          AND a."attendancePeriodId" = ${attendancePeriodId}
      `;
      const todayAttendancesRaw = await client.$queryRawUnsafe(attendanceQuery);
      
      // Transform to nested structure
      const todayAttendances = (todayAttendancesRaw as any[]).map(row => ({
        ...row,
        employee: {
          id: row.employee_id,
          firstName: row.employee_firstName,
          lastName: row.employee_lastName,
          department: row.employee_department,
          position: row.employee_position,
          email: row.employee_email,
        }
      }));

      // Get attendance period using raw SQL
      const periodQuery = `
        SELECT * FROM "attendance_period"
        WHERE id = ${attendancePeriodId}
        LIMIT 1
      `;
      const periodResult = await client.$queryRawUnsafe(periodQuery);
      const attendancePeriod = (periodResult as any[])[0] || null;

      return {
        allEmployees: allEmployees as any[],
        todayAttendances: todayAttendances as any[],
        attendancePeriod,
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
        allEmployees: [],
        todayAttendances: [],
        attendancePeriod: null,
      };
    }
  }

  async getEmployeeAttendanceToday(tenantSlug: string, employeeId: number, date: Date) {
    const client = this.attendancePrisma.getClient(tenantSlug);
    const dateStr = date.toISOString().split('T')[0];

    try {
      const query = `
        SELECT * FROM "attendances"
        WHERE "employeeId" = ${employeeId}
          AND "date" = '${dateStr}'::date
        LIMIT 1
      `;
      const result = await client.$queryRawUnsafe(query);
      return (result as any[])[0] || null;
    } catch (error) {
      return null;
    }
  }
}