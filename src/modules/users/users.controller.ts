import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';

@ApiTags('Users')
@Controller(':tenant_slug/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user account for the tenant',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  async createUser(
    @Param('tenant_slug') tenantSlug: string,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.createUser(tenantSlug, createUserDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieves all users for the tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users',
  })
  async getUsers(@Param('tenant_slug') tenantSlug: string) {
    const result = await this.usersService.getUsers(tenantSlug);
    console.log(
      `[DEBUG] getUsers for ${tenantSlug}:`,
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieves a specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  async getUser(
    @Param('tenant_slug') tenantSlug: string,
    @Param('id') userId: string,
  ) {
    return this.usersService.getUser(tenantSlug, userId);
  }
}
