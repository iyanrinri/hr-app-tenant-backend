import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatabaseTenantService } from '../../database/database-tenant.service';
import { AuthService } from '../../auth/auth.service';
import { RegisterDto, LoginDto, UserProfileDto } from './dto';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private databaseTenantService: DatabaseTenantService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, tenantName, slug, firstName, lastName, password } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Check if slug already exists
    const existingSlug = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new BadRequestException('Slug already exists');
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(password);

    // Create tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: tenantName,
        slug: slug,
        email: email,
      },
    });

    try {
      // Create tenant database with initial seed data
      await this.databaseTenantService.createTenantDatabase(slug, {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: 'ADMIN',
      });
    } catch (error) {
      // Rollback tenant creation if database creation fails
      await this.prisma.tenant.delete({
        where: { id: tenant.id },
      });
      throw error;
    }

    // Create user for the tenant
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'ADMIN', // First user is admin
        tenantId: tenant.id,
      },
      include: {
        tenant: true,
      },
    });

    // Generate token
    const tokenResponse = await this.authService.generateToken(user);

    return {
      message: 'Registration successful',
      ...tokenResponse,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Validate user credentials
    const user = await this.authService.validateUser(email, password);

    // Generate token
    const tokenResponse = await this.authService.generateToken(user);

    return {
      message: 'Login successful',
      ...tokenResponse,
    };
  }

  async logout() {
    // Stateless JWT logout - token remains valid until expiry
    // In a real app, you might add token to a blacklist
    return {
      message: 'Logout successful',
    };
  }

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Exclude password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }

  async updateProfile(userId: string, updateData: Partial<RegisterDto>) {
    const { firstName, lastName } = updateData;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
      },
      include: {
        tenant: true,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as any;
  }
}
