import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { AttendancePeriodService } from '../services/attendance-period.service';
import { AttendancePeriodScheduler } from '../services/attendance-period.scheduler';
import { CreateAttendancePeriodDto } from '../dto/create-attendance-period.dto';
import { UpdateAttendancePeriodDto } from '../dto/update-attendance-period.dto';
import { CreateHolidayDto } from '../dto/create-holiday.dto';
import { FindAllPeriodsDto } from '../dto/find-all-periods.dto';
import { AttendancePeriodResponseDto, HolidayResponseDto } from '../dto/period-response.dto';
import { SchedulerRunResponseDto, SchedulerStatsWrapperDto } from '../dto/scheduler-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('attendance-periods')
@Controller(':tenant_slug/attendance-periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER, Role.HR, Role.ADMIN)
@ApiBearerAuth('bearer')
export class AttendancePeriodController {
  constructor(
    private readonly attendancePeriodService: AttendancePeriodService,
    private readonly attendancePeriodScheduler: AttendancePeriodScheduler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create attendance period (SUPER/HR/ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Attendance period created successfully.', type: AttendancePeriodResponseDto })
  create(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createDto: CreateAttendancePeriodDto,
    @Request() req: any
  ) {
    return this.attendancePeriodService.create(tenantSlug, createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all attendance periods (SUPER/HR/ADMIN only)' })
  @ApiResponse({ status: 200, description: 'List of attendance periods.', type: [AttendancePeriodResponseDto] })
  findAll(
    @Param('tenant_slug') tenantSlug: string,
    @Query() query: FindAllPeriodsDto
  ) {
    return this.attendancePeriodService.findAll(tenantSlug, query);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current active attendance period (SUPER/HR/ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Current active attendance period.', type: AttendancePeriodResponseDto })
  getActivePeriod(
    @Param('tenant_slug') tenantSlug: string
  ) {
    return this.attendancePeriodService.getActivePeriod(tenantSlug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get attendance period by ID (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Attendance period ID' })
  @ApiResponse({ status: 200, description: 'Attendance period details.', type: AttendancePeriodResponseDto })
  findOne(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.attendancePeriodService.findOne(tenantSlug, BigInt(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update attendance period (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Attendance period ID' })
  @ApiResponse({ status: 200, description: 'Attendance period updated successfully.', type: AttendancePeriodResponseDto })
  update(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAttendancePeriodDto
  ) {
    return this.attendancePeriodService.update(tenantSlug, BigInt(id), updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete attendance period (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Attendance period ID' })
  @ApiResponse({ status: 200, description: 'Attendance period deleted successfully.' })
  remove(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.attendancePeriodService.remove(tenantSlug, BigInt(id));
  }

  // Holiday management endpoints
  @Post('holidays')
  @ApiOperation({ summary: 'Create holiday (SUPER/HR/ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Holiday created successfully.', type: HolidayResponseDto })
  createHoliday(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createDto: CreateHolidayDto
  ) {
    return this.attendancePeriodService.createHoliday(tenantSlug, createDto);
  }

  @Get('holidays/list')
  @ApiOperation({ summary: 'Get holidays (SUPER/HR/ADMIN only)' })
  @ApiResponse({ status: 200, description: 'List of holidays.', type: [HolidayResponseDto] })
  findHolidays(
    @Param('tenant_slug') tenantSlug: string,
    @Query('attendancePeriodId') attendancePeriodId?: string
  ) {
    return this.attendancePeriodService.findHolidays(
      tenantSlug,
      attendancePeriodId ? BigInt(attendancePeriodId) : undefined
    );
  }

  @Patch('holidays/:id')
  @ApiOperation({ summary: 'Update holiday (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Holiday ID' })
  @ApiResponse({ status: 200, description: 'Holiday updated successfully.' })
  updateHoliday(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreateHolidayDto>
  ) {
    return this.attendancePeriodService.updateHoliday(tenantSlug, BigInt(id), updateData);
  }

  @Delete('holidays/:id')
  @ApiOperation({ summary: 'Delete holiday (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', description: 'Holiday ID' })
  @ApiResponse({ status: 200, description: 'Holiday deleted successfully.' })
  deleteHoliday(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.attendancePeriodService.deleteHoliday(tenantSlug, BigInt(id));
  }

  // Scheduler endpoints
  @Post('scheduler/run-check')
  @ApiOperation({ summary: 'Manually run period status check (SUPER/HR/ADMIN only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Period check completed successfully.',
    type: SchedulerRunResponseDto 
  })
  async runPeriodsCheck(
    @Param('tenant_slug') tenantSlug: string
  ) {
    await this.attendancePeriodScheduler.runPeriodsCheck(tenantSlug);
    return {
      status: 'success',
      message: 'Period status check completed',
      timestamp: new Date(),
    };
  }

  @Get('scheduler/stats')
  @ApiOperation({ summary: 'Get period scheduler statistics (SUPER/HR/ADMIN only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Period scheduler statistics.',
    type: SchedulerStatsWrapperDto 
  })
  async getSchedulerStats(
    @Param('tenant_slug') tenantSlug: string
  ) {
    const stats = await this.attendancePeriodScheduler.getPeriodStatusStats(tenantSlug);
    return {
      status: 'success',
      data: stats,
    };
  }
}