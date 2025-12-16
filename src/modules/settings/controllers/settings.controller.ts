import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SettingsService } from '../services/settings.service';
import { CreateSettingDto, SettingCategory } from '../dto/create-setting.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import { SettingsFilterDto } from '../dto/settings-filter.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '@prisma/client';

@ApiTags('settings')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new setting',
    description: 'Create a new application setting. Only SUPER users can create settings.' 
  })
  @ApiResponse({ status: 201, description: 'Setting created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only SUPER users can create settings' })
  @ApiResponse({ status: 409, description: 'Setting key already exists' })
  async create(@Body() createSettingDto: CreateSettingDto, @Request() req: any) {
    if (req.user.role !== Role.SUPER) {
      throw new ForbiddenException('Only SUPER users can create settings');
    }

    return this.settingsService.create(req.user.tenantSlug, createSettingDto, req.user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all settings with pagination and filtering',
    description: 'Retrieve settings with pagination, filtering, and search. SUPER users see all, others see only public settings.' 
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async findAll(@Query() filter: SettingsFilterDto, @Request() req: any) {
    // Non-super users can only see public settings
    if (req.user.role !== Role.SUPER) {
      filter.isPublic = true;
    }

    return this.settingsService.findAll(req.user.tenantSlug, filter);
  }

  @Get('public')
  @ApiOperation({ 
    summary: 'Get all public settings',
    description: 'Retrieve all public settings available to all authenticated users' 
  })
  @ApiResponse({ status: 200, description: 'Public settings retrieved successfully' })
  async getPublicSettings(@Request() req: any) {
    return this.settingsService.getPublicSettings(req.user.tenantSlug);
  }

  @Get('company')
  @ApiOperation({ 
    summary: 'Get company information',
    description: 'Retrieve public company settings formatted for display' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Company information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'PT. Contoh Teknologi' },
        description: { type: 'string', example: 'Leading technology company' },
        logo: { type: 'string', example: 'https://example.com/logo.png' },
        address: { type: 'string', example: 'Jakarta, Indonesia' },
        phone: { type: 'string', example: '+62-21-12345678' },
        email: { type: 'string', example: 'info@company.com' },
        website: { type: 'string', example: 'https://company.com' },
        language: { type: 'string', example: 'en' },
        timezone: { type: 'string', example: 'Asia/Jakarta' },
      }
    }
  })
  async getCompanyInfo(@Request() req: any) {
    return this.settingsService.getCompanyInfo(req.user.tenantSlug);
  }

  @Get('attendance')
  @ApiOperation({ 
    summary: 'Get attendance settings',
    description: 'Retrieve attendance-related settings. Only SUPER and HR users can access.' 
  })
  @ApiResponse({ status: 200, description: 'Attendance settings retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only SUPER and HR users can access attendance settings' })
  async getAttendanceSettings(@Request() req: any) {
    if (req.user.role !== Role.SUPER && req.user.role !== Role.HR) {
      throw new ForbiddenException('Only SUPER and HR users can access attendance settings');
    }

    return this.settingsService.getAttendanceSettings(req.user.tenantSlug);
  }

  @Get('category/:category')
  @ApiOperation({ 
    summary: 'Get settings by category',
    description: 'Retrieve all settings in a specific category. SUPER users see all, others see only public.' 
  })
  @ApiParam({ 
    name: 'category', 
    enum: SettingCategory,
    description: 'Setting category to filter by' 
  })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getByCategory(
    @Param('category') category: SettingCategory,
    @Request() req: any
  ) {
    const settings = await this.settingsService.getByCategory(req.user.tenantSlug, category);
    
    // Non-super users can only see public settings
    if (req.user.role !== Role.SUPER) {
      return settings.filter((setting: any) => setting?.isPublic);
    }

    return settings;
  }

  @Get(':key')
  @ApiOperation({ 
    summary: 'Get setting by key',
    description: 'Retrieve a specific setting by its key. SUPER users can access all, others only public settings.' 
  })
  @ApiParam({ name: 'key', description: 'Setting key', example: 'company_name' })
  @ApiResponse({ status: 200, description: 'Setting retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access private setting' })
  async findOne(@Param('key') key: string, @Request() req: any) {
    const setting = await this.settingsService.findByKey(req.user.tenantSlug, key);
    
    if (!setting) {
      throw new ForbiddenException('Setting not found');
    }

    // Non-super users can only see public settings
    if (req.user.role !== Role.SUPER && !setting.isPublic) {
      throw new ForbiddenException('Cannot access private setting');
    }

    return setting;
  }

  @Patch(':key')
  @ApiOperation({ 
    summary: 'Update setting by key',
    description: 'Update a specific setting. Only SUPER users can update settings.' 
  })
  @ApiParam({ name: 'key', description: 'Setting key', example: 'company_name' })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only SUPER users can update settings' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async update(
    @Param('key') key: string,
    @Body() updateSettingDto: UpdateSettingDto,
    @Request() req: any
  ) {
    if (req.user.role !== Role.SUPER) {
      throw new ForbiddenException('Only SUPER users can update settings');
    }

    return this.settingsService.update(req.user.tenantSlug, key, updateSettingDto, req.user.id);
  }

  @Delete(':key')
  @ApiOperation({ 
    summary: 'Delete setting by key',
    description: 'Delete a specific setting. Only SUPER users can delete settings.' 
  })
  @ApiParam({ name: 'key', description: 'Setting key', example: 'custom_setting' })
  @ApiResponse({ status: 200, description: 'Setting deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only SUPER users can delete settings' })
  @ApiResponse({ status: 404, description: 'Setting not found' })
  async remove(@Param('key') key: string, @Request() req: any) {
    if (req.user.role !== Role.SUPER) {
      throw new ForbiddenException('Only SUPER users can delete settings');
    }

    return this.settingsService.remove(req.user.tenantSlug, key);
  }

  @Post('initialize')
  @ApiOperation({ 
    summary: 'Initialize default settings',
    description: 'Create default application settings. Only SUPER users can initialize.' 
  })
  @ApiResponse({ status: 201, description: 'Default settings initialized successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only SUPER users can initialize settings' })
  async initializeDefaults(@Request() req: any) {
    if (req.user.role !== Role.SUPER) {
      throw new ForbiddenException('Only SUPER users can initialize settings');
    }

    return this.settingsService.initializeDefaultSettings(req.user.tenantSlug, req.user.id);
  }
}