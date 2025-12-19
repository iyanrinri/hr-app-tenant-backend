import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { LeaveTypeService } from '../services/leave-type.service';
import { CreateLeaveTypeConfigDto, UpdateLeaveTypeConfigDto, LeaveTypeConfigResponseDto } from '../dto/leave-type.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('leave-types')
@Controller(':tenant_slug/leave-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class LeaveTypeController {
  constructor(private readonly leaveTypeService: LeaveTypeService) {}

  @Post()
  @Roles(Role.SUPER, Role.HR, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new leave type configuration (SUPER/HR/ADMIN only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Leave type configuration created successfully.',
    type: LeaveTypeConfigResponseDto 
  })
  async create(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createLeaveTypeDto: CreateLeaveTypeConfigDto
  ): Promise<LeaveTypeConfigResponseDto> {
    return this.leaveTypeService.create(tenantSlug, createLeaveTypeDto);
  }

  @Get()
  @Roles(Role.SUPER, Role.HR, Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get all leave type configurations' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of leave type configurations retrieved successfully.',
    type: [LeaveTypeConfigResponseDto]
  })
  async findAll(
    @Param('tenant_slug') tenantSlug: string
  ): Promise<LeaveTypeConfigResponseDto[]> {
    return this.leaveTypeService.findAll(tenantSlug);
  }

  @Get(':id')
  @Roles(Role.SUPER, Role.HR, Role.ADMIN, Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get leave type configuration by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave type configuration ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave type configuration retrieved successfully.',
    type: LeaveTypeConfigResponseDto 
  })
  async findOne(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number
  ): Promise<LeaveTypeConfigResponseDto> {
    return this.leaveTypeService.findOne(tenantSlug, id);
  }

  @Patch(':id')
  @Roles(Role.SUPER, Role.HR, Role.ADMIN)
  @ApiOperation({ summary: 'Update leave type configuration (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave type configuration ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Leave type configuration updated successfully.',
    type: LeaveTypeConfigResponseDto 
  })
  async update(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeaveTypeDto: UpdateLeaveTypeConfigDto
  ): Promise<LeaveTypeConfigResponseDto> {
    return this.leaveTypeService.update(tenantSlug, id, updateLeaveTypeDto);
  }

  @Delete(':id')
  @Roles(Role.SUPER, Role.HR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete leave type configuration (SUPER/HR/ADMIN only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Leave type configuration ID' })
  @ApiResponse({ status: 200, description: 'Leave type configuration deleted successfully.' })
  async remove(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id', ParseIntPipe) id: number
  ): Promise<{ message: string }> {
    await this.leaveTypeService.remove(tenantSlug, id);
    return { message: 'Leave type configuration deleted successfully' };
  }
}