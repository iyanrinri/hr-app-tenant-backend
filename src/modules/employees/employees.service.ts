import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeePrismaService } from '../../database/employee-prisma.service';
import { AuthService } from '../../auth/auth.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeResponseDto,
  FindAllEmployeesDto,
  EmployeeProfileDto,
  PaginatedEmployeeResponseDto,
  OrganizationTreeDto,
  SetManagerDto,
} from './dto';

@Injectable()
export class EmployeesService {
  constructor(
    private employeePrisma: EmployeePrismaService,
    private authService: AuthService,
  ) {}

  /**
   * Create a new employee with auto-generated user account
   */
  async createEmployee(
    tenantSlug: string,
    createEmployeeDto: CreateEmployeeDto,
  ) {
    const client = this.employeePrisma.getClient(tenantSlug);

    // Check if user with this email already exists
    const existingUsersQuery = `SELECT * FROM "users" WHERE email = '${createEmployeeDto.email}'`;
    const existingUsers = await client.$queryRawUnsafe(existingUsersQuery);

    if (existingUsers && existingUsers.length > 0) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash the password (use a default if not provided)
    const password = createEmployeeDto.password || this.generateDefaultPassword();
    const hashedPassword = await this.authService.hashPassword(password);

    try {
      // Create user first using raw query - only basic fields
      const userInsertQuery = `
        INSERT INTO "users" (
          email, password, "firstName", "lastName", role, 
          "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          '${createEmployeeDto.email}', '${hashedPassword}', '${createEmployeeDto.firstName}', '${createEmployeeDto.lastName}', 'EMPLOYEE',
          true, NOW(), NOW()
        )
        RETURNING id, email, "firstName", "lastName", role, "isActive"
      `;
      
      const userResult = await client.$queryRawUnsafe(userInsertQuery);
      const user = userResult[0];

      // Create employee linked to the user
      const employeeInsertQuery = `
        INSERT INTO "employees" (
          "userId", "firstName", "lastName", "position", "department", "joinDate",
          "isActive", "createdAt", "updatedAt"
        )
        VALUES (
          ${user.id}, '${createEmployeeDto.firstName}', '${createEmployeeDto.lastName}',
          '${createEmployeeDto.position}', '${createEmployeeDto.department}', '${new Date(createEmployeeDto.joinDate).toISOString()}',
          true, NOW(), NOW()
        )
        RETURNING *
      `;
      
      const employeeResult = await client.$queryRawUnsafe(employeeInsertQuery);
      return this.formatProfileResponse(employeeResult[0]);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create employee: ${error.message}`,
      );
    }
  }

  /**
   * Get all employees with optional filtering and pagination
   */
  async getEmployees(
    tenantSlug: string,
    findAllEmployeesDto: FindAllEmployeesDto,
  ): Promise<PaginatedEmployeeResponseDto> {
    const client = this.employeePrisma.getClient(tenantSlug);
    const {
      page = 1,
      limit = 10,
      search,
      department,
      employmentStatus,
      isActive,
      managerId,
      sortBy = 'firstName',
      sortOrder = 'asc',
    } = findAllEmployeesDto;

    const offset = (page - 1) * limit;
    const validSortFields = ['firstName', 'lastName', 'position', 'joinDate', 'createdAt', 'department'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'firstName';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';

    // Build WHERE clause using Prisma's queryRawUnsafe for the entire query
    let whereClause = '"deletedAt" IS NULL';

    if (search) {
      whereClause += ` AND ("firstName" ILIKE '%${search}%' OR "lastName" ILIKE '%${search}%' OR "position" ILIKE '%${search}%' OR "department" ILIKE '%${search}%')`;
    }

    if (department) {
      whereClause += ` AND "department" = '${department}'`;
    }

    if (employmentStatus) {
      whereClause += ` AND "employmentStatus" = '${employmentStatus}'`;
    }

    if (isActive !== undefined) {
      whereClause += ` AND "isActive" = ${isActive ? 'true' : 'false'}`;
    }

    if (managerId) {
      whereClause += ` AND "managerId" = ${managerId}`;
    }

    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM "employees" WHERE ${whereClause}`;
      const countResult = await client.$queryRawUnsafe(countQuery);
      const total = parseInt(countResult[0].count.toString());

      // Get employees with sorting and pagination
      const query = `SELECT * FROM "employees" WHERE ${whereClause} ORDER BY "${sortField}" ${validSortOrder} LIMIT ${limit} OFFSET ${offset}`;
      const employees = await client.$queryRawUnsafe(query);

      const data = employees.map((emp: any) => this.formatProfileResponse(emp));
      const pages = Math.ceil(total / limit);

      return {
        data,
        page,
        limit,
        total,
        pages,
      };
    } catch (error) {
      throw new BadRequestException(`Error fetching employees: ${error.message}`);
    }
  }

  /**
   * Get single employee with full profile
   */
  async getEmployee(
    tenantSlug: string,
    employeeId: string,
  ): Promise<EmployeeProfileDto> {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    return this.formatProfileResponse(employees[0]);
  }

  /**
   * Update employee information
   */
  async updateEmployee(
    tenantSlug: string,
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<EmployeeProfileDto> {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const updates: string[] = [];
    const params: any[] = [];

    // Build dynamic update clause
    if (updateEmployeeDto.firstName !== undefined) {
      updates.push('"firstName" = $' + (params.length + 1));
      params.push(updateEmployeeDto.firstName);
    }
    if (updateEmployeeDto.lastName !== undefined) {
      updates.push('"lastName" = $' + (params.length + 1));
      params.push(updateEmployeeDto.lastName);
    }
    if (updateEmployeeDto.position !== undefined) {
      updates.push('"position" = $' + (params.length + 1));
      params.push(updateEmployeeDto.position);
    }
    if (updateEmployeeDto.department !== undefined) {
      updates.push('"department" = $' + (params.length + 1));
      params.push(updateEmployeeDto.department);
    }
    if (updateEmployeeDto.phoneNumber !== undefined) {
      updates.push('"phoneNumber" = $' + (params.length + 1));
      params.push(updateEmployeeDto.phoneNumber);
    }
    if (updateEmployeeDto.address !== undefined) {
      updates.push('"address" = $' + (params.length + 1));
      params.push(updateEmployeeDto.address);
    }
    if (updateEmployeeDto.baseSalary !== undefined) {
      updates.push('"baseSalary" = $' + (params.length + 1));
      params.push(updateEmployeeDto.baseSalary);
    }
    if (updateEmployeeDto.managerId !== undefined) {
      updates.push('"managerId" = $' + (params.length + 1));
      params.push(updateEmployeeDto.managerId || null);
    }
    if (updateEmployeeDto.isActive !== undefined) {
      updates.push('"isActive" = $' + (params.length + 1));
      params.push(updateEmployeeDto.isActive);
    }

    updates.push('"updatedAt" = NOW()');

    if (updates.length === 1) {
      // Only updatedAt
      return this.formatProfileResponse(employees[0]);
    }

    const updateQuery = `UPDATE "employees" SET ${updates.join(', ')} WHERE id = ${Number(employeeId)} RETURNING *`;

    const updated = await client.$queryRaw(updateQuery, ...params);

    return this.formatProfileResponse(updated[0]);
  }

  /**
   * Soft delete employee
   */
  async deleteEmployee(tenantSlug: string, employeeId: string) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const deleted = await client.$queryRaw`
      UPDATE "employees" SET "deletedAt" = NOW(), "updatedAt" = NOW() WHERE id = ${Number(employeeId)} RETURNING *
    `;

    return this.formatProfileResponse(deleted[0]);
  }

  /**
   * Restore a soft-deleted employee
   */
  async restoreEmployee(tenantSlug: string, employeeId: string) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NOT NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Deleted employee not found');
    }

    const restored = await client.$queryRaw`
      UPDATE "employees" SET "deletedAt" = NULL, "updatedAt" = NOW() WHERE id = ${Number(employeeId)} RETURNING *
    `;

    return this.formatProfileResponse(restored[0]);
  }

  /**
   * Set employee's manager
   */
  async setManager(
    tenantSlug: string,
    employeeId: string,
    setManagerDto: SetManagerDto,
  ) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    // Check if manager exists
    const managers = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${setManagerDto.managerId} AND "deletedAt" IS NULL
    `;

    if (!managers || managers.length === 0) {
      throw new NotFoundException('Manager not found');
    }

    // Prevent self-assignment
    if (Number(employeeId) === setManagerDto.managerId) {
      throw new BadRequestException('Cannot assign employee as their own manager');
    }

    const updated = await client.$queryRaw`
      UPDATE "employees" SET "managerId" = ${setManagerDto.managerId}, "updatedAt" = NOW() WHERE id = ${Number(employeeId)} RETURNING *
    `;

    return this.formatProfileResponse(updated[0]);
  }

  /**
   * Get employee's subordinates (direct reports)
   */
  async getSubordinates(tenantSlug: string, employeeId: string) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const subordinates = await client.$queryRaw`
      SELECT * FROM "employees" WHERE "managerId" = ${Number(employeeId)} AND "deletedAt" IS NULL ORDER BY "firstName" ASC
    `;

    return subordinates.map((emp: any) => this.formatProfileResponse(emp));
  }

  /**
   * Get complete organization tree starting from an employee
   */
  async getOrganizationTree(
    tenantSlug: string,
    employeeId: string,
  ): Promise<OrganizationTreeDto> {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const employee = employees[0];
    return this.buildOrganizationTree(client, employee);
  }

  /**
   * Get employee by user ID
   */
  async findByUserId(tenantSlug: string, userId: number) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE "userId" = ${userId} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      return null;
    }

    return this.formatProfileResponse(employees[0]);
  }

  /**
   * Get management chain (manager -> manager's manager -> etc)
   */
  async getManagementChain(tenantSlug: string, employeeId: string) {
    const client = this.employeePrisma.getClient(tenantSlug);

    const chain: EmployeeProfileDto[] = [];
    let currentId = Number(employeeId);

    while (currentId) {
      const employees = await client.$queryRaw`
        SELECT * FROM "employees" WHERE id = ${currentId}
      `;

      if (!employees || employees.length === 0) break;

      const employee = employees[0];
      chain.push(this.formatProfileResponse(employee));

      currentId = employee.managerId;
    }

    return chain;
  }

  /**
   * Helper: Format employee response with profile data
   */
  private formatProfileResponse(employee: any): EmployeeProfileDto {
    return {
      id: employee.id?.toString(),
      userId: employee.userId?.toString() || null,
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
      department: employee.department,
      joinDate: new Date(employee.joinDate),
      employeeNumber: employee.employeeNumber,
      dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : null,
      gender: employee.gender,
      maritalStatus: employee.maritalStatus,
      nationality: employee.nationality,
      religion: employee.religion,
      bloodType: employee.bloodType,
      idNumber: employee.idNumber,
      taxNumber: employee.taxNumber,
      phoneNumber: employee.phoneNumber,
      alternativePhone: employee.alternativePhone,
      address: employee.address,
      city: employee.city,
      province: employee.province,
      postalCode: employee.postalCode,
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      emergencyContactRelation: employee.emergencyContactRelation,
      bankName: employee.bankName,
      bankAccountNumber: employee.bankAccountNumber,
      bankAccountName: employee.bankAccountName,
      employmentStatus: employee.employmentStatus,
      contractStartDate: employee.contractStartDate ? new Date(employee.contractStartDate) : null,
      contractEndDate: employee.contractEndDate ? new Date(employee.contractEndDate) : null,
      workLocation: employee.workLocation,
      baseSalary: employee.baseSalary ? Number(employee.baseSalary) : null,
      profilePicture: employee.profilePicture,
      managerId: employee.managerId,
      isActive: employee.isActive,
      deletedAt: employee.deletedAt ? new Date(employee.deletedAt) : null,
      createdAt: new Date(employee.createdAt),
      updatedAt: new Date(employee.updatedAt),
    };
  }

  /**
   * Helper: Format simple employee response
   */
  private formatEmployeeResponse(employee: any): EmployeeResponseDto {
    return {
      id: employee.id.toString(),
      userId: employee.userId ? employee.userId.toString() : null,
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
      department: employee.department,
      joinDate: employee.joinDate,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  /**
   * Helper: Generate default password
   */
  private generateDefaultPassword(): string {
    return (
      'Temp' +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 4).toUpperCase()
    );
  }

  /**
   * Helper: Build organization tree recursively
   */
  private async buildOrganizationTree(
    client: any,
    employee: any,
  ): Promise<OrganizationTreeDto> {
    const subordinates = await client.$queryRaw`
      SELECT * FROM "employees" WHERE "managerId" = ${employee.id} AND "deletedAt" IS NULL ORDER BY "firstName" ASC
    `;

    const subordinateTrees: OrganizationTreeDto[] = [];

    for (const subordinate of subordinates) {
      subordinateTrees.push(await this.buildOrganizationTree(client, subordinate));
    }

    return {
      id: employee.id.toString(),
      firstName: employee.firstName,
      lastName: employee.lastName,
      position: employee.position,
      department: employee.department,
      subordinates: subordinateTrees,
    };
  }
}
