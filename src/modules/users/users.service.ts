import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeePrismaService } from '../../database/employee-prisma.service';
import { AuthService } from '../../auth/auth.service';
import { CreateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private employeePrisma: EmployeePrismaService,
    private authService: AuthService,
  ) {}

  async createUser(tenantSlug: string, createUserDto: CreateUserDto) {
    const client = this.employeePrisma.getClient(tenantSlug);

    // Check if user already exists
    const existingUser = await client.employeeUser.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(
      createUserDto.password,
    );

    const user = await client.employeeUser.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role as any,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUsers(tenantSlug: string) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const users = await client.employeeUser.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  async getUser(tenantSlug: string, userId: string) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const user = await client.employeeUser.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
