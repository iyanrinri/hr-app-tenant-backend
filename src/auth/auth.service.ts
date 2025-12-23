import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { MultiTenantPrismaService } from '../database/multi-tenant-prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private multiTenantPrisma: MultiTenantPrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  async generateToken(user: any) {
    // Fetch employee data if user is an employee
    let employeeId: string | undefined;
    
    if (user.tenant?.slug) {
      try {
        const tenantPrisma = this.multiTenantPrisma.getClient(user.tenant.slug);
        const employee = await tenantPrisma.employee.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        
        if (employee) {
          employeeId = employee.id.toString();
        }
      } catch (error) {
        // If employee not found or error, continue without employeeId
      }
    }
    
    const payload = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenant?.slug,
      role: user.role,
      employeeId, // Add employee ID to JWT payload
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        tenantSlug: user.tenant?.slug,
        role: user.role,
        employeeId, // Include in response
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltOrRounds = 10;
    return bcrypt.hash(password, saltOrRounds);
  }

  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
