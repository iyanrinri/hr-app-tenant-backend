import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserAuthService } from './user-auth.service';
import { CreateLoginDto, UpdatePasswordDto } from './dto/login.dto';

@ApiTags('Tenant User Auth')
@Controller('/:tenant_slug/auth')
export class UserAuthController {
  constructor(private userAuthService: UserAuthService) {}

  /**
   * Login endpoint for users (employees, HR, ADMIN)
   */
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'User Login',
    description: 'Login user (Employee, HR, or ADMIN) for a specific tenant',
  })
  @ApiParam({
    name: 'tenant_slug',
    description: 'Tenant slug/identifier',
    example: 'test_corp',
  })
  @ApiBody({
    type: CreateLoginDto,
    examples: {
      example1: {
        value: {
          email: 'admin@testcorp.com',
          password: 'TestPassword@123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkB0ZXN0Y29ycC5jb20iLCJmaXJzdE5hbWUiOiJBZG1pbiIsImxhc3ROYW1lIjoiVXNlciIsInRlbmFudFNsdWciOiJ0ZXN0X2NvcnAiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NjU2OTA2NjcsImV4cCI6MTc2NTc3NzA2N30.x94zBR1UH1KF8aEKLq0Cr0lNmkGUsqta7tMSzMFu4D0',
        user: {
          id: 1,
          email: 'admin@testcorp.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  async login(
    @Param('tenant_slug') tenantSlug: string,
    @Body() loginDto: CreateLoginDto,
  ) {
    return this.userAuthService.loginUser(
      tenantSlug,
      loginDto.email,
      loginDto.password,
    );
  }

  /**
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get User Profile',
    description: 'Get the profile of the currently logged-in user',
  })
  @ApiParam({
    name: 'tenant_slug',
    description: 'Tenant slug/identifier',
    example: 'test_corp',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 1,
        email: 'admin@testcorp.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2025-12-14T05:32:22.074Z',
        updatedAt: '2025-12-14T05:32:22.074Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getProfile(
    @Param('tenant_slug') tenantSlug: string,
    @Request() req: any,
  ) {
    return this.userAuthService.getUserProfile(tenantSlug, req.user.id);
  }

  /**
   * Update user password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change User Password',
    description: 'Update the password of the currently logged-in user',
  })
  @ApiParam({
    name: 'tenant_slug',
    description: 'Tenant slug/identifier',
    example: 'test_corp',
  })
  @ApiBody({
    type: UpdatePasswordDto,
    examples: {
      example1: {
        value: {
          oldPassword: 'TestPassword@123',
          newPassword: 'NewPassword@456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'Password updated successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid old password or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async changePassword(
    @Param('tenant_slug') tenantSlug: string,
    @Request() req: any,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.userAuthService.updatePassword(
      tenantSlug,
      req.user.id,
      updatePasswordDto.oldPassword,
      updatePasswordDto.newPassword,
    );
  }

  /**
   * Logout endpoint
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'User Logout',
    description: 'Logout the currently logged-in user',
  })
  @ApiParam({
    name: 'tenant_slug',
    description: 'Tenant slug/identifier',
    example: 'test_corp',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logout successful',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async logout(
    @Param('tenant_slug') tenantSlug: string,
    @Request() req: any,
  ) {
    return this.userAuthService.logoutUser(tenantSlug, req.user.id);
  }
}
