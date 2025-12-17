import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { SettingsPrismaService } from '../../../database/settings-prisma.service';
import { CreateSettingDto, SettingDataType, SettingCategory } from '../dto/create-setting.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import { SettingsFilterDto } from '../dto/settings-filter.dto';

@Injectable()
export class SettingsService {
  constructor(private settingsPrisma: SettingsPrismaService) {
    if (!this.settingsPrisma) {
      console.error('[Settings Service] SettingsPrismaService is not injected!');
    }
  }

  private getClient(tenantId: string) {
    console.log('[Settings Service getClient] Called with tenantId:', tenantId);
    
    if (!tenantId || tenantId.trim() === '') {
      const error = new BadRequestException('Tenant slug is required and cannot be empty');
      console.error('[Settings Service getClient] Error:', error.message);
      throw error;
    }

    if (!this.settingsPrisma) {
      const error = new BadRequestException('SettingsPrismaService is not available');
      console.error('[Settings Service getClient] Error:', error.message);
      throw error;
    }

    console.log('[Settings Service getClient] Calling settingsPrisma.getClient...');
    const client = this.settingsPrisma.getClient(tenantId);
    
    if (!client) {
      const error = new BadRequestException('Failed to get database client for tenant');
      console.error('[Settings Service getClient] Client is null/undefined');
      throw error;
    }

    console.log('[Settings Service getClient] Got client successfully');
    return client;
  }

  async create(tenantId: string, createSettingDto: CreateSettingDto, userId: string) {
    const client = this.getClient(tenantId);

    // Check if setting key already exists
    const existing = await client.setting.findUnique({
      where: { key: createSettingDto.key },
    });
    
    if (existing) {
      throw new ConflictException(`Setting with key '${createSettingDto.key}' already exists`);
    }

    // Validate value based on data type
    this.validateSettingValue(createSettingDto.value, createSettingDto.dataType);

    try {
      await client.setting.create({
        data: {
          ...createSettingDto,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      const result = await client.setting.findUnique({
        where: { key: createSettingDto.key },
      });

      return this.transformSetting(result);
    } catch (error) {
      console.error('Create setting error:', error);
      throw new BadRequestException('Failed to create setting');
    }
  }

  async findAll(tenantId: string, filter: SettingsFilterDto) {
    console.log('[Settings Service findAll] Called with tenantId:', tenantId, 'filter:', filter);
    
    try {
      const client = this.getClient(tenantId);
      console.log('[Settings Service findAll] Got client, proceeding with query');
    
      const { page = 1, limit = 10, category, isPublic, searchTerm } = filter;
      const skip = (page - 1) * limit;
      const take = limit;

      let whereConditions: string[] = [];

      if (category) {
        whereConditions.push(`category = '${category}'`);
      }

      if (isPublic !== undefined) {
        whereConditions.push(`"isPublic" = ${isPublic}`);
      }

      if (searchTerm) {
        const escapedTerm = searchTerm.replace(/'/g, "''");
        whereConditions.push(`(key ILIKE '%${escapedTerm}%' OR description ILIKE '%${escapedTerm}%')`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      console.log('[Settings Service findAll] Executing query with where clause:', whereClause);

      const [settings, countResult] = await Promise.all([
        client.$queryRawUnsafe(
          `SELECT * FROM "settings" ${whereClause} ORDER BY category ASC, key ASC LIMIT ${take} OFFSET ${skip}`
        ),
        client.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "settings" ${whereClause}`
        ),
      ]);

      const total = (countResult as any[])[0]?.count || 0;
      const totalNumber = typeof total === 'bigint' ? Number(total) : total;

      console.log('[Settings Service findAll] Query successful, got', settings.length, 'settings');

      return {
        data: (settings as any[]).map((setting: any) => this.transformSetting(setting)),
        pagination: {
          page,
          limit,
          total: totalNumber,
          totalPages: Math.ceil(totalNumber / limit),
        },
      };
    } catch (error) {
      console.error('[Settings Service findAll] Error:', error);
      throw error;
    }
  }

  async findByKey(tenantId: string, key: string) {
    const client = this.getClient(tenantId);
    const setting = await client.setting.findUnique({
      where: { key },
    });
    
    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return this.transformSetting(setting);
  }

  async update(tenantId: string, key: string, updateSettingDto: UpdateSettingDto, userId: string) {
    const client = this.getClient(tenantId);
    
    // Check if setting exists
    const existing = await client.$queryRawUnsafe(
      `SELECT * FROM "settings" WHERE key = '${key}'`
    );
    
    if (!existing || (existing as any[]).length === 0) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    const existingSetting = (existing as any[])[0];

    // Validate value if provided
    if (updateSettingDto.value !== undefined) {
      const dataType = updateSettingDto.dataType || existingSetting.dataType;
      this.validateSettingValue(updateSettingDto.value, dataType);
    }

    try {
      const updateValue = updateSettingDto.value !== undefined ? updateSettingDto.value.replace(/'/g, "''") : existingSetting.value;
      const updateDataType = updateSettingDto.dataType || existingSetting.dataType;
      
      await client.$queryRawUnsafe(
        `UPDATE "settings" 
         SET value = '${updateValue}', 
             "dataType" = '${updateDataType}',
             "updatedBy" = '${userId}', 
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE key = '${key}'`
      );

      const result = await client.$queryRawUnsafe(
        `SELECT * FROM "settings" WHERE key = '${key}'`
      );

      return this.transformSetting((result as any[])[0]);
    } catch (error) {
      console.error('Update setting error:', error);
      throw new BadRequestException('Failed to update setting');
    }
  }

  async remove(tenantId: string, key: string) {
    const client = this.getClient(tenantId);
    const existing = await client.setting.findUnique({
      where: { key },
    });
    
    if (!existing) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    await client.setting.delete({
      where: { key },
    });
    
    return { message: `Setting '${key}' deleted successfully` };
  }

  async getByCategory(tenantId: string, category: SettingCategory) {
    const client = this.getClient(tenantId);
    const settings = await client.setting.findMany({
      where: { category },
    });
    return settings.map((setting: any) => this.transformSetting(setting));
  }

  async getPublicSettings(tenantId: string) {
    const client = this.getClient(tenantId);
    const settings = await client.setting.findMany({
      where: { isPublic: true },
    });
    return settings.map((setting: any) => this.transformSetting(setting));
  }

  async getCompanyInfo(tenantId: string) {
    const companySettings = await this.getByCategory(tenantId, SettingCategory.COMPANY);
    const publicSettings = companySettings.filter((setting: any) => setting?.isPublic);

    const companyInfo: any = {
      name: null,
      description: null,
      logo: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      language: 'en',
      timezone: 'UTC',
    };

    publicSettings.forEach((setting: any) => {
      const parsed = this.parseSettingValue(setting.value, setting.dataType);
      switch (setting.key) {
        case 'company_name':
          companyInfo.name = parsed;
          break;
        case 'company_description':
          companyInfo.description = parsed;
          break;
        case 'company_logo':
          companyInfo.logo = parsed;
          break;
        case 'company_address':
          companyInfo.address = parsed;
          break;
        case 'company_phone':
          companyInfo.phone = parsed;
          break;
        case 'company_email':
          companyInfo.email = parsed;
          break;
        case 'company_website':
          companyInfo.website = parsed;
          break;
        case 'system_language':
          companyInfo.language = parsed;
          break;
        case 'system_timezone':
          companyInfo.timezone = parsed;
          break;
      }
    });

    return companyInfo;
  }

  async getAttendanceSettings(tenantId: string) {
    const attendanceSettings = await this.getByCategory(tenantId, SettingCategory.ATTENDANCE);
    
    const settings: any = {
      allowWeekendWork: false,
      checkPointEnabled: false,
      checkPointRadius: 100,
      checkPointLatitude: null,
      checkPointLongitude: null,
      checkPointAddress: null,
      lateToleranceMinutes: 15,
      earlyLeaveToleranceMinutes: 15,
      autoClockOutEnabled: false,
      autoClockOutTime: '18:00',
      overtimeEnabled: false,
      overtimeMinThreshold: 60,
      overtimeMaxHoursPerDay: 4,
      overtimeMaxHoursPerWeek: 20,
      overtimeMaxHoursPerMonth: 80,
      overtimeWeekdayRate: 1.5,
      overtimeWeekendRate: 2.0,
      overtimeHolidayRate: 3.0,
      overtimeRequiresApproval: true,
      overtimeManagerApprovalRequired: true,
      overtimeHrApprovalRequired: true,
    };

    attendanceSettings.forEach((setting: any) => {
      const parsed = this.parseSettingValue(setting.value, setting.dataType);
      switch (setting.key) {
        case 'attendance_weekend_work':
          settings.allowWeekendWork = parsed;
          break;
        case 'attendance_checkpoint_enabled':
          settings.checkPointEnabled = parsed;
          break;
        case 'attendance_checkpoint_radius':
          settings.checkPointRadius = parsed;
          break;
        case 'attendance_checkpoint_lat':
          settings.checkPointLatitude = parsed && parsed !== '' ? parseFloat(parsed) : null;
          break;
        case 'attendance_checkpoint_lng':
          settings.checkPointLongitude = parsed && parsed !== '' ? parseFloat(parsed) : null;
          break;
        case 'attendance_checkpoint_address':
          settings.checkPointAddress = parsed;
          break;
        case 'attendance_late_tolerance':
          settings.lateToleranceMinutes = parsed;
          break;
        case 'attendance_early_leave_tolerance':
          settings.earlyLeaveToleranceMinutes = parsed;
          break;
        case 'attendance_auto_clockout':
          settings.autoClockOutEnabled = parsed;
          break;
        case 'attendance_auto_clockout_time':
          settings.autoClockOutTime = parsed;
          break;
        case 'attendance_overtime_enabled':
          settings.overtimeEnabled = parsed;
          break;
        case 'attendance_overtime_threshold':
          settings.overtimeMinThreshold = parsed;
          break;
        case 'overtime_max_hours_per_day':
          settings.overtimeMaxHoursPerDay = parsed;
          break;
        case 'overtime_max_hours_per_week':
          settings.overtimeMaxHoursPerWeek = parsed;
          break;
        case 'overtime_max_hours_per_month':
          settings.overtimeMaxHoursPerMonth = parsed;
          break;
        case 'overtime_weekday_rate':
          settings.overtimeWeekdayRate = parsed;
          break;
        case 'overtime_weekend_rate':
          settings.overtimeWeekendRate = parsed;
          break;
        case 'overtime_holiday_rate':
          settings.overtimeHolidayRate = parsed;
          break;
        case 'overtime_requires_approval':
          settings.overtimeRequiresApproval = parsed;
          break;
        case 'overtime_manager_approval_required':
          settings.overtimeManagerApprovalRequired = parsed;
          break;
        case 'overtime_hr_approval_required':
          settings.overtimeHrApprovalRequired = parsed;
          break;
      }
    });

    return settings;
  }

  async getOvertimeSettings() {
    return {
      enabled: false,
      minThresholdMinutes: 60,
      maxHoursPerDay: 4,
      maxHoursPerWeek: 20,
      maxHoursPerMonth: 80,
      weekdayRate: 1.5,
      weekendRate: 2.0,
      holidayRate: 3.0,
      requiresApproval: true,
      managerApprovalRequired: true,
      hrApprovalRequired: true,
    };
  }

  async initializeDefaultSettings(tenantId: string, userId: string) {
    const client = this.getClient(tenantId);
    
    const defaultSettings = [
      { key: 'company_name', value: 'Your Company Name', category: SettingCategory.COMPANY, description: 'Company name displayed in application', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'company_description', value: 'Your company description', category: SettingCategory.COMPANY, description: 'Brief company description', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'company_logo', value: '', category: SettingCategory.COMPANY, description: 'Company logo URL or base64', dataType: SettingDataType.FILE, isPublic: true },
      { key: 'company_address', value: '', category: SettingCategory.COMPANY, description: 'Company address', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'company_phone', value: '', category: SettingCategory.COMPANY, description: 'Company phone number', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'company_email', value: '', category: SettingCategory.COMPANY, description: 'Company email address', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'company_website', value: '', category: SettingCategory.COMPANY, description: 'Company website URL', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'system_language', value: 'en', category: SettingCategory.GENERAL, description: 'Default application language', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'system_timezone', value: 'UTC', category: SettingCategory.GENERAL, description: 'Default timezone', dataType: SettingDataType.STRING, isPublic: false },
      { key: 'system_date_format', value: 'YYYY-MM-DD', category: SettingCategory.GENERAL, description: 'Date display format', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'system_time_format', value: '24h', category: SettingCategory.GENERAL, description: 'Time display format (12h/24h)', dataType: SettingDataType.STRING, isPublic: true },
      { key: 'attendance_weekend_work', value: 'false', category: SettingCategory.ATTENDANCE, description: 'Allow weekend attendance', dataType: SettingDataType.BOOLEAN, isPublic: false },
      { key: 'attendance_checkpoint_enabled', value: 'false', category: SettingCategory.ATTENDANCE, description: 'Enable location-based check point', dataType: SettingDataType.BOOLEAN, isPublic: false },
      { key: 'attendance_checkpoint_radius', value: '100', category: SettingCategory.ATTENDANCE, description: 'Check point radius in meters', dataType: SettingDataType.INTEGER, isPublic: false },
      { key: 'attendance_checkpoint_lat', value: '', category: SettingCategory.ATTENDANCE, description: 'Check point latitude', dataType: SettingDataType.STRING, isPublic: false },
      { key: 'attendance_checkpoint_lng', value: '', category: SettingCategory.ATTENDANCE, description: 'Check point longitude', dataType: SettingDataType.STRING, isPublic: false },
      { key: 'attendance_checkpoint_address', value: '', category: SettingCategory.ATTENDANCE, description: 'Check point address', dataType: SettingDataType.STRING, isPublic: false },
      { key: 'attendance_late_tolerance', value: '15', category: SettingCategory.ATTENDANCE, description: 'Late tolerance in minutes', dataType: SettingDataType.INTEGER, isPublic: false },
      { key: 'attendance_early_leave_tolerance', value: '15', category: SettingCategory.ATTENDANCE, description: 'Early leave tolerance in minutes', dataType: SettingDataType.INTEGER, isPublic: false },
      { key: 'attendance_overtime_enabled', value: 'false', category: SettingCategory.ATTENDANCE, description: 'Enable overtime tracking', dataType: SettingDataType.BOOLEAN, isPublic: false },
      { key: 'attendance_overtime_threshold', value: '60', category: SettingCategory.ATTENDANCE, description: 'Overtime threshold in minutes', dataType: SettingDataType.INTEGER, isPublic: false },
      { key: 'notification_email_enabled', value: 'false', category: SettingCategory.NOTIFICATION, description: 'Enable email notifications', dataType: SettingDataType.BOOLEAN, isPublic: false },
      { key: 'notification_sms_enabled', value: 'false', category: SettingCategory.NOTIFICATION, description: 'Enable SMS notifications', dataType: SettingDataType.BOOLEAN, isPublic: false },
      { key: 'notification_realtime_enabled', value: 'true', category: SettingCategory.NOTIFICATION, description: 'Enable real-time notifications', dataType: SettingDataType.BOOLEAN, isPublic: false },
      { key: 'security_session_timeout', value: '3600', category: SettingCategory.SECURITY, description: 'Session timeout in seconds', dataType: SettingDataType.INTEGER, isPublic: false },
      { key: 'security_password_min_length', value: '8', category: SettingCategory.SECURITY, description: 'Minimum password length', dataType: SettingDataType.INTEGER, isPublic: false },
      { key: 'security_max_login_attempts', value: '5', category: SettingCategory.SECURITY, description: 'Maximum login attempts before lockout', dataType: SettingDataType.INTEGER, isPublic: false },
    ];

    const createdSettings = [];

    for (const setting of defaultSettings) {
      try {
        // Check if setting already exists
        const existing = await client.$queryRawUnsafe(
          `SELECT * FROM "settings" WHERE key = '${setting.key}'`
        );
        
        if (!existing || (existing as any[]).length === 0) {
          await client.$queryRawUnsafe(
            `INSERT INTO "settings" (key, value, category, description, "dataType", "isPublic", "createdBy", "updatedBy", "createdAt", "updatedAt")
             VALUES ('${setting.key}', '${setting.value.replace(/'/g, "''")}', '${setting.category}', '${setting.description.replace(/'/g, "''")}', '${setting.dataType}', ${setting.isPublic}, '${userId}', '${userId}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
          );
          createdSettings.push(setting.key);
        }
      } catch (error) {
        console.error(`Failed to create default setting: ${setting.key}`, error);
      }
    }

    return {
      message: 'Default settings initialized',
      created: createdSettings,
    };
  }

  private transformSetting(setting: any) {
    if (!setting) return null;

    return {
      id: setting.id?.toString(),
      key: setting.key,
      value: setting.value,
      parsedValue: this.parseSettingValue(setting.value, setting.dataType),
      category: setting.category,
      description: setting.description,
      dataType: setting.dataType,
      isPublic: setting.isPublic,
      createdAt: setting.createdAt instanceof Date ? setting.createdAt.toISOString() : setting.createdAt,
      updatedAt: setting.updatedAt instanceof Date ? setting.updatedAt.toISOString() : setting.updatedAt,
      createdBy: setting.createdByEmail,
      updatedBy: setting.updatedByEmail,
    };
  }

  private parseSettingValue(value: string, dataType: string) {
    switch (dataType) {
      case SettingDataType.BOOLEAN:
        return value === 'true';
      case SettingDataType.INTEGER:
        return parseFloat(value);
      case SettingDataType.JSON:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      case SettingDataType.STRING:
      case SettingDataType.FILE:
      default:
        return value;
    }
  }

  private validateSettingValue(value: string, dataType: string) {
    switch (dataType) {
      case SettingDataType.BOOLEAN:
        if (value !== 'true' && value !== 'false') {
          throw new BadRequestException('Boolean setting must be "true" or "false"');
        }
        break;
      case SettingDataType.INTEGER:
        if (isNaN(parseFloat(value))) {
          throw new BadRequestException('Number setting must be a valid number');
        }
        break;
      case SettingDataType.JSON:
        try {
          JSON.parse(value);
        } catch {
          throw new BadRequestException('JSON setting must be valid JSON');
        }
        break;
    }
  }
}
