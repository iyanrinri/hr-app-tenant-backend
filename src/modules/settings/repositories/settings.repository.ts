import { Injectable, BadRequestException } from '@nestjs/common';
import { EmployeePrismaService } from '../../../database/employee-prisma.service';
import { CreateSettingDto } from '../dto/create-setting.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import { SettingsFilterDto } from '../dto/settings-filter.dto';

@Injectable()
export class SettingsRepository {
  constructor(private readonly employeePrisma: EmployeePrismaService) {}

  private getPrismaForTenant(tenantSlug: string): any {
    if (!tenantSlug || tenantSlug.trim() === '') {
      throw new BadRequestException('Tenant slug is required and cannot be empty');
    }
    console.log('getPrismaForTenant called with:', tenantSlug);
    const client = this.employeePrisma.getClient(tenantSlug);
    console.log('Got client:', client ? 'defined' : 'undefined');
    return client;
  }

  async create(tenantSlug: string, data: CreateSettingDto & { createdBy: string; updatedBy: string }) {
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.create({
      data: {
        ...data,
        dataType: data.dataType as any,
        category: data.category as any,
      },
    });
  }

  async findByKey(tenantSlug: string, key: string) {
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.findUnique({
      where: { key },
    });
  }

  async update(tenantSlug: string, key: string, data: UpdateSettingDto & { updatedBy: string }) {
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.update({
      where: { key },
      data: {
        ...data,
        dataType: data.dataType ? data.dataType as any : undefined,
        category: data.category ? data.category as any : undefined,
      },
    });
  }

  async delete(tenantSlug: string, key: string) {
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.delete({
      where: { key },
    });
  }

  async findAll(tenantSlug: string, filter: SettingsFilterDto) {
    const {
      page = 1,
      limit = 10,
      category,
      isPublic,
      searchTerm,
    } = filter;

    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    if (searchTerm) {
      where.OR = [
        { key: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.findMany({
      where,
      skip,
      take,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });
  }

  async count(tenantSlug: string, filter: SettingsFilterDto) {
    const {
      category,
      isPublic,
      searchTerm,
    } = filter;

    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    if (searchTerm) {
      where.OR = [
        { key: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.count({ where });
  }

  async getByCategory(tenantSlug: string, category: string) {
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }

  async getPublicSettings(tenantSlug: string) {
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.findMany({
      where: { isPublic: true },
      select: {
        key: true,
        value: true,
        category: true,
        description: true,
        dataType: true,
      },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });
  }

  async createMany(tenantSlug: string, settings: any[]) {
    const data = settings.map((setting: any) => ({
      ...setting,
      dataType: setting.dataType as any,
      category: setting.category as any,
    }));
    
    const prisma = this.getPrismaForTenant(tenantSlug);
    return prisma.setting.createMany({
      data,
      skipDuplicates: true,
    });
  }
}