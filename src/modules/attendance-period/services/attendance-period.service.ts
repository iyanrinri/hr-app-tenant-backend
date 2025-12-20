import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
import { CreateAttendancePeriodDto } from '../dto/create-attendance-period.dto';
import { UpdateAttendancePeriodDto } from '../dto/update-attendance-period.dto';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { FindAllPeriodsDto } from '../dto/find-all-periods.dto';

@Injectable()
export class AttendancePeriodService {
  constructor(private prisma: MultiTenantPrismaService) {}

  async create(tenantSlug: string, createDto: CreateAttendancePeriodDto, userId: string) {
    const client = this.prisma.getClient(tenantSlug);
    const startDate = new Date(createDto.startDate).toISOString();
    const endDate = new Date(createDto.endDate).toISOString();

    // Validate dates
    if (new Date(createDto.startDate) >= new Date(createDto.endDate)) {
      throw new BadRequestException('Start date must be before end date');
    }

    // Check for overlapping periods
    const overlappingQuery = `
      SELECT * FROM "attendance_period" 
      WHERE (
        "startDate" <= '${endDate}'::timestamp AND "endDate" >= '${startDate}'::timestamp
      )
    `;
    const overlapping = await client.$queryRawUnsafe(overlappingQuery);

    if ((overlapping as any[]).length > 0) {
      throw new ConflictException('Attendance period overlaps with existing period');
    }

    const insertQuery = `
      INSERT INTO "attendance_period" (
        name, "startDate", "endDate", "workingDaysPerWeek", "workingHoursPerDay",
        "workingStartTime", "workingEndTime", "allowSaturdayWork", "allowSundayWork",
        "lateToleranceMinutes", "earlyLeaveToleranceMinutes", description, "isActive",
        "createdBy", "createdAt", "updatedAt"
      )
      VALUES (
        '${createDto.name.replace(/'/g, "''")}', '${startDate}', '${endDate}',
        ${createDto.workingDaysPerWeek || 5}, ${createDto.workingHoursPerDay || 8},
        '${createDto.workingStartTime || '09:00'}', '${createDto.workingEndTime || '17:00'}',
        ${createDto.allowSaturdayWork ? 'true' : 'false'}, ${createDto.allowSundayWork ? 'true' : 'false'},
        ${createDto.lateToleranceMinutes ?? 15}, ${createDto.earlyLeaveToleranceMinutes ?? 15},
        '${(createDto.description || '').replace(/'/g, "''")}', ${createDto.isActive !== false ? 'true' : 'false'},
        '${userId}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const result = await client.$queryRawUnsafe(insertQuery);
    return this.transformPeriod((result as any[])[0]);
  }

  async findAll(tenantSlug: string, query: FindAllPeriodsDto) {
    const client = this.prisma.getClient(tenantSlug);
    let whereClause = '';

    if (query.search) {
      whereClause += ` AND name ILIKE '%${query.search.replace(/'/g, "''")}%'`;
    }

    if (query.isActive !== undefined) {
      whereClause += ` AND "isActive" = ${query.isActive ? 'true' : 'false'}`;
    }

    if (query.page && query.limit) {
      const page = query.page;
      const limit = query.limit;
      const skip = (page - 1) * limit;

      const countQuery = `SELECT COUNT(*) as count FROM "attendance_period" WHERE 1=1 ${whereClause}`;
      const countResult = await client.$queryRawUnsafe(countQuery);
      const total = Number((countResult as any[])[0]?.count || 0);

      const selectQuery = `
        SELECT * FROM "attendance_period"
        WHERE 1=1 ${whereClause}
        ORDER BY "startDate" DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      const periods = await client.$queryRawUnsafe(selectQuery);

      return {
        data: (periods as any[]).map(p => this.transformPeriod(p)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } else {
      const selectQuery = `
        SELECT * FROM "attendance_period"
        WHERE 1=1 ${whereClause}
        ORDER BY "startDate" DESC
      `;
      const periods = await client.$queryRawUnsafe(selectQuery);
      return (periods as any[]).map(p => this.transformPeriod(p));
    }
  }

  async findOne(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    const query = `SELECT * FROM "attendance_period" WHERE id = ${id}`;
    const result = await client.$queryRawUnsafe(query);

    if (!result || (result as any[]).length === 0) {
      throw new NotFoundException('Attendance period not found');
    }

    return this.transformPeriod((result as any[])[0]);
  }

  async update(tenantSlug: string, id: bigint, updateDto: UpdateAttendancePeriodDto) {
    const client = this.prisma.getClient(tenantSlug);
    
    const existing = await this.findOne(tenantSlug, id);
    if (!existing) {
      throw new NotFoundException('Attendance period not found');
    }

    let updateFields: string[] = [];

    if (updateDto.name !== undefined) updateFields.push(`name = '${updateDto.name.replace(/'/g, "''")}'`);
    if (updateDto.description !== undefined) updateFields.push(`description = '${(updateDto.description || '').replace(/'/g, "''")}'`);
    if (updateDto.isActive !== undefined) updateFields.push(`"isActive" = ${updateDto.isActive ? 'true' : 'false'}`);
    if (updateDto.workingDaysPerWeek !== undefined) updateFields.push(`"workingDaysPerWeek" = ${updateDto.workingDaysPerWeek}`);
    if (updateDto.workingHoursPerDay !== undefined) updateFields.push(`"workingHoursPerDay" = ${updateDto.workingHoursPerDay}`);
    if (updateDto.workingStartTime !== undefined) updateFields.push(`"workingStartTime" = '${updateDto.workingStartTime}'`);
    if (updateDto.workingEndTime !== undefined) updateFields.push(`"workingEndTime" = '${updateDto.workingEndTime}'`);
    if (updateDto.allowSaturdayWork !== undefined) updateFields.push(`"allowSaturdayWork" = ${updateDto.allowSaturdayWork ? 'true' : 'false'}`);
    if (updateDto.allowSundayWork !== undefined) updateFields.push(`"allowSundayWork" = ${updateDto.allowSundayWork ? 'true' : 'false'}`);
    if (updateDto.lateToleranceMinutes !== undefined) updateFields.push(`"lateToleranceMinutes" = ${updateDto.lateToleranceMinutes}`);
    if (updateDto.earlyLeaveToleranceMinutes !== undefined) updateFields.push(`"earlyLeaveToleranceMinutes" = ${updateDto.earlyLeaveToleranceMinutes}`);

    // Handle date updates
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate ? new Date(updateDto.startDate).toISOString() : existing.startDate;
      const endDate = updateDto.endDate ? new Date(updateDto.endDate).toISOString() : existing.endDate;

      if (new Date(startDate) >= new Date(endDate)) {
        throw new BadRequestException('Start date must be before end date');
      }

      // Check for overlapping periods
      const overlappingQuery = `
        SELECT * FROM "attendance_period"
        WHERE id != ${id} AND (
          "startDate" <= '${endDate}'::timestamp AND "endDate" >= '${startDate}'::timestamp
        )
      `;
      const overlapping = await client.$queryRawUnsafe(overlappingQuery);

      if ((overlapping as any[]).length > 0) {
        throw new ConflictException('Updated attendance period would overlap with existing period');
      }

      if (updateDto.startDate) updateFields.push(`"startDate" = '${startDate}'`);
      if (updateDto.endDate) updateFields.push(`"endDate" = '${endDate}'`);
    }

    if (updateFields.length === 0) {
      return this.transformPeriod(existing);
    }

    updateFields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    const updateQuery = `
      UPDATE "attendance_period"
      SET ${updateFields.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;

    const result = await client.$queryRawUnsafe(updateQuery);
    return this.transformPeriod((result as any[])[0]);
  }

  async remove(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    const existing = await this.findOne(tenantSlug, id);
    if (!existing) {
      throw new NotFoundException('Attendance period not found');
    }

    const deleteQuery = `DELETE FROM "attendance_period" WHERE id = ${id}`;
    await client.$queryRawUnsafe(deleteQuery);
    
    return { message: 'Attendance period deleted successfully' };
  }

  async getActivePeriod(tenantSlug: string) {
    const client = this.prisma.getClient(tenantSlug);
    const query = `
      SELECT * FROM "attendance_period"
      WHERE "isActive" = true
      AND "startDate" <= CURRENT_TIMESTAMP
      AND "endDate" >= CURRENT_TIMESTAMP
      LIMIT 1
    `;
    const result = await client.$queryRawUnsafe(query);

    if (!result || (result as any[]).length === 0) {
      throw new NotFoundException('No active attendance period found');
    }

    return this.transformPeriod((result as any[])[0]);
  }

  async createHoliday(tenantSlug: string, createDto: CreateHolidayDto) {
    const client = this.prisma.getClient(tenantSlug);
    const holidayDate = new Date(createDto.date).toISOString();

    const insertQuery = `
      INSERT INTO "holiday" (
        name, date, "isNational", "isRecurring", description,
        ${createDto.attendancePeriodId ? '"attendancePeriodId",' : ''}"createdAt", "updatedAt"
      )
      VALUES (
        '${createDto.name.replace(/'/g, "''")}', '${holidayDate}',
        ${createDto.isNational ? 'true' : 'false'},
        ${createDto.isRecurring ? 'true' : 'false'},
        '${(createDto.description || '').replace(/'/g, "''")}',
        ${createDto.attendancePeriodId ? `${createDto.attendancePeriodId},` : ''}CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const result = await client.$queryRawUnsafe(insertQuery);
    return this.transformHoliday((result as any[])[0]);
  }

  async findHolidays(tenantSlug: string, attendancePeriodId?: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    
    let whereClause = '';
    if (attendancePeriodId) {
      whereClause = `WHERE ("attendancePeriodId" = ${attendancePeriodId} OR ("attendancePeriodId" IS NULL AND "isNational" = true))`;
    }

    const query = `
      SELECT * FROM "holiday"
      ${whereClause}
      ORDER BY date ASC
    `;
    
    const holidays = await client.$queryRawUnsafe(query);
    return (holidays as any[]).map(h => this.transformHoliday(h));
  }

  async updateHoliday(tenantSlug: string, id: bigint, updateData: Partial<CreateHolidayDto>) {
    const client = this.prisma.getClient(tenantSlug);
    
    let updateFields: string[] = [];
    if (updateData.name !== undefined) updateFields.push(`name = '${updateData.name.replace(/'/g, "''")}'`);
    if (updateData.date !== undefined) updateFields.push(`date = '${new Date(updateData.date).toISOString()}'`);
    if (updateData.isNational !== undefined) updateFields.push(`"isNational" = ${updateData.isNational ? 'true' : 'false'}`);
    if (updateData.isRecurring !== undefined) updateFields.push(`"isRecurring" = ${updateData.isRecurring ? 'true' : 'false'}`);
    if (updateData.description !== undefined) updateFields.push(`description = '${(updateData.description || '').replace(/'/g, "''")}'`);

    if (updateFields.length === 0) {
      const selectQuery = `SELECT * FROM "holiday" WHERE id = ${id}`;
      const result = await client.$queryRawUnsafe(selectQuery);
      return this.transformHoliday((result as any[])[0]);
    }

    updateFields.push(`"updatedAt" = CURRENT_TIMESTAMP`);
    const updateQuery = `
      UPDATE "holiday"
      SET ${updateFields.join(', ')}
      WHERE id = ${id}
      RETURNING *
    `;

    const result = await client.$queryRawUnsafe(updateQuery);
    return this.transformHoliday((result as any[])[0]);
  }

  async deleteHoliday(tenantSlug: string, id: bigint) {
    const client = this.prisma.getClient(tenantSlug);
    const deleteQuery = `DELETE FROM "holiday" WHERE id = ${id}`;
    await client.$queryRawUnsafe(deleteQuery);
    return { message: 'Holiday deleted successfully' };
  }

  private transformPeriods(periods: any[]) {
    return periods.map(period => this.transformPeriod(period));
  }

  private transformPeriod(period: any) {
    return {
      id: period.id.toString(),
      name: period.name,
      startDate: period.startDate instanceof Date ? period.startDate.toISOString() : period.startDate,
      endDate: period.endDate instanceof Date ? period.endDate.toISOString() : period.endDate,
      workingDaysPerWeek: period.workingDaysPerWeek,
      workingHoursPerDay: period.workingHoursPerDay,
      workingStartTime: period.workingStartTime || '09:00',
      workingEndTime: period.workingEndTime || '17:00',
      allowSaturdayWork: period.allowSaturdayWork || false,
      allowSundayWork: period.allowSundayWork || false,
      lateToleranceMinutes: period.lateToleranceMinutes || 15,
      earlyLeaveToleranceMinutes: period.earlyLeaveToleranceMinutes || 15,
      isActive: period.isActive,
      description: period.description,
      createdBy: period.createdBy?.toString(),
      createdAt: period.createdAt instanceof Date ? period.createdAt.toISOString() : period.createdAt,
      updatedAt: period.updatedAt instanceof Date ? period.updatedAt.toISOString() : period.updatedAt,
    };
  }

  private transformHoliday(holiday: any) {
    return {
      id: holiday.id.toString(),
      name: holiday.name,
      date: holiday.date instanceof Date ? holiday.date.toISOString() : holiday.date,
      isNational: holiday.isNational,
      isRecurring: holiday.isRecurring,
      description: holiday.description,
      attendancePeriodId: holiday.attendancePeriodId?.toString() || null,
      createdAt: holiday.createdAt instanceof Date ? holiday.createdAt.toISOString() : holiday.createdAt,
      updatedAt: holiday.updatedAt instanceof Date ? holiday.updatedAt.toISOString() : holiday.updatedAt,
    };
  }


  async isWorkingDay(tenantSlug :string, date: Date, attendancePeriodId?: bigint): Promise<boolean> {
    // Get the period configuration
    let periodConfig;
    if (attendancePeriodId) {
      periodConfig = await this.findOne(tenantSlug, attendancePeriodId);
    } else {
      periodConfig = await this.getActivePeriod(tenantSlug);
    }

    if (!periodConfig) {
      throw new Error('No attendance period found');
    }

    // Check if it's weekend and whether weekend work is allowed
    const dayOfWeek = date.getDay();
    
    // Sunday = 0, Saturday = 6
    if (dayOfWeek === 0 && !periodConfig.allowSundayWork) {
      return false; // Sunday not allowed
    }
    
    if (dayOfWeek === 6 && !periodConfig.allowSaturdayWork) {
      return false; // Saturday not allowed  
    }

    // Check if it's a holiday
    const client = this.prisma.getClient(tenantSlug);
    const dateStr = date.toISOString().split('T')[0];
    
    let whereClause = `WHERE date::date = '${dateStr}'::date`;
    if (attendancePeriodId) {
      whereClause += ` AND ("attendancePeriodId" = ${attendancePeriodId} OR ("attendancePeriodId" IS NULL AND "isNational" = true))`;
    }
    
    const query = `SELECT * FROM "holiday" ${whereClause}`;
    const holidays = await client.$queryRawUnsafe(query);
    
    return (holidays as any[]).length === 0;
  }
}