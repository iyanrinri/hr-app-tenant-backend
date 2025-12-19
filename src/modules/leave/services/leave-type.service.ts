import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LeaveTypeRepository } from '../repositories/leave-type.repository';
import { CreateLeaveTypeConfigDto, UpdateLeaveTypeConfigDto, LeaveTypeConfigResponseDto } from '../dto/leave-type.dto';

@Injectable()
export class LeaveTypeService {
  constructor(private readonly leaveTypeRepository: LeaveTypeRepository) {}

  async create(tenantSlug: string, createLeaveTypeDto: CreateLeaveTypeConfigDto): Promise<LeaveTypeConfigResponseDto> {
    const createData = {
      type: createLeaveTypeDto.type,
      name: createLeaveTypeDto.name,
      description: createLeaveTypeDto.description,
      defaultQuota: createLeaveTypeDto.defaultQuota,
      maxConsecutiveDays: createLeaveTypeDto.maxConsecutiveDays,
      advanceNoticeDays: createLeaveTypeDto.advanceNoticeDays,
      isCarryForward: createLeaveTypeDto.isCarryForward,
      maxCarryForward: createLeaveTypeDto.maxCarryForward,
      isActive: createLeaveTypeDto.isActive ?? true,
      leavePeriod: {
        connect: { id: BigInt(createLeaveTypeDto.leavePeriodId) }
      }
    };

    const leaveTypeConfig = await this.leaveTypeRepository.create(tenantSlug, createData);
    return this.mapToResponseDto(leaveTypeConfig);
  }

  async findAll(tenantSlug: string): Promise<LeaveTypeConfigResponseDto[]> {
    const leaveTypeConfigs = await this.leaveTypeRepository.findAll(tenantSlug);
    return leaveTypeConfigs.map((config: any) => this.mapToResponseDto(config));
  }

  async findOne(tenantSlug: string, id: number): Promise<LeaveTypeConfigResponseDto> {
    const leaveTypeConfig = await this.leaveTypeRepository.findById(tenantSlug, id);
    if (!leaveTypeConfig) {
      throw new NotFoundException(`Leave type configuration with ID ${id} not found`);
    }
    return this.mapToResponseDto(leaveTypeConfig);
  }

  async update(tenantSlug: string, id: number, updateLeaveTypeDto: UpdateLeaveTypeConfigDto): Promise<LeaveTypeConfigResponseDto> {
    const existingConfig = await this.leaveTypeRepository.findById(tenantSlug, id);
    if (!existingConfig) {
      throw new NotFoundException(`Leave type configuration with ID ${id} not found`);
    }

    const updatedConfig = await this.leaveTypeRepository.update(tenantSlug, id, updateLeaveTypeDto);
    return this.mapToResponseDto(updatedConfig);
  }

  async remove(tenantSlug: string, id: number): Promise<void> {
    const existingConfig = await this.leaveTypeRepository.findById(tenantSlug, id);
    if (!existingConfig) {
      throw new NotFoundException(`Leave type configuration with ID ${id} not found`);
    }

    // Check if leave type config is being used in any leave balances or requests
    const isUsed = await this.leaveTypeRepository.isUsedInBalancesOrRequests(tenantSlug, id);
    if (isUsed) {
      throw new BadRequestException('Cannot delete leave type configuration that is being used in leave balances or requests');
    }

    await this.leaveTypeRepository.delete(tenantSlug, id);
  }

  private mapToResponseDto(leaveTypeConfig: any): LeaveTypeConfigResponseDto {
    return {
      id: Number(leaveTypeConfig.id),
      type: leaveTypeConfig.type,
      name: leaveTypeConfig.name,
      description: leaveTypeConfig.description,
      defaultQuota: leaveTypeConfig.defaultQuota,
      maxConsecutiveDays: leaveTypeConfig.maxConsecutiveDays,
      advanceNoticeDays: leaveTypeConfig.advanceNoticeDays,
      isCarryForward: leaveTypeConfig.isCarryForward,
      maxCarryForward: leaveTypeConfig.maxCarryForward,
      isActive: leaveTypeConfig.isActive,
      createdAt: leaveTypeConfig.createdAt,
      updatedAt: leaveTypeConfig.updatedAt
    };
  }
}