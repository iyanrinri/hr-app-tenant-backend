import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmployeePrismaService } from '../database/employee-prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserAuthService {
  constructor(
    private employeePrisma: EmployeePrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Login user with email and password for a specific tenant
   */
  async loginUser(tenantSlug: string, email: string, password: string) {
    try {
      const client = this.employeePrisma.getClient(tenantSlug);

      // Get user from tenant database
      const userQuery = `SELECT * FROM "users" WHERE email = '${email}' AND "deletedAt" IS NULL`;
      const users = await client.$queryRawUnsafe(userQuery);

      if (!users || users.length === 0) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const user = users[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Generate JWT token
      const payload = {
        id: Number(user.id), // Convert BigInt to number
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantSlug,
        role: user.role,
      };

      const access_token = this.jwtService.sign(payload, {
        expiresIn: '24h',
      });

      return {
        access_token,
        user: {
          id: Number(user.id),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
        },
      };
    } catch (error) {
      // Handle database not found error
      if (error.code === 'P2010' && error.meta?.driverAdapterError?.cause?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException(`Your company/tenant is not exists`);
      }

      // Re-throw auth errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadRequestException(`Login failed: ${error.message}`);
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(tenantSlug: string, userId: number) {
    try {
      const client = this.employeePrisma.getClient(tenantSlug);

      const userQuery = `SELECT * FROM "users" WHERE id = ${userId} AND "deletedAt" IS NULL`;
      const users = await client.$queryRawUnsafe(userQuery);

      if (!users || users.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const user = users[0];

      return {
        id: Number(user.id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      // Handle database not found error
      if (error.code === 'P2010' && error.meta?.driverAdapterError?.cause?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException(`Your company/tenant is not exists`);
      }

      // Re-throw auth errors
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new BadRequestException(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    tenantSlug: string,
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      const client = this.employeePrisma.getClient(tenantSlug);

      // Get user
      const userQuery = `SELECT * FROM "users" WHERE id = ${userId} AND "deletedAt" IS NULL`;
      const users = await client.$queryRawUnsafe(userQuery);

      if (!users || users.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const user = users[0];

      // Verify old password
      const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      const updateQuery = `
        UPDATE "users" 
        SET password = '${hashedPassword}', "updatedAt" = NOW()
        WHERE id = ${userId}
        RETURNING id, email, "firstName", "lastName", role
      `;

      await client.$queryRawUnsafe(updateQuery);

      return {
        message: 'Password updated successfully',
      };
    } catch (error) {
      // Handle database not found error
      if (error.code === 'P2010' && error.meta?.driverAdapterError?.cause?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException(`Your company/tenant is not exists`);
      }

      // Re-throw known errors
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Logout user (token blacklist - optional, can be handled on client side)
   */
  async logoutUser(tenantSlug: string, userId: number) {
    // This is typically handled client-side by deleting the token
    // But you can implement token blacklist here if needed
    return {
      message: 'Logout successful',
    };
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
