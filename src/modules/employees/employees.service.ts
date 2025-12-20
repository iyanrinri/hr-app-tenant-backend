import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MultiTenantPrismaService } from '@/database/multi-tenant-prisma.service';
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
import { AuthService } from '@/auth/auth.service';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: MultiTenantPrismaService,
    private authService: AuthService,
  ) {}

  /**
   * Create a new employee with auto-generated user account and initial salary
   */
  async createEmployee(
    tenantSlug: string,
    createEmployeeDto: CreateEmployeeDto,
  ) {
    const client = this.prisma.getClient(tenantSlug);
    const { baseSalary, allowances = 0, ...employeeData } = createEmployeeDto;

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
      const employee = employeeResult[0];

      // Create initial salary record if baseSalary is provided
      if (baseSalary) {
        const salaryEffectiveDate = new Date(createEmployeeDto.joinDate).toISOString().split('T')[0];
        
        const salaryInsertQuery = `
          INSERT INTO "salaries" (
            "employeeId", "baseSalary", allowances, "effectiveDate", "isActive", "createdBy", "createdAt", "updatedAt"
          )
          VALUES (
            ${employee.id}, ${baseSalary}, ${allowances}, '${salaryEffectiveDate}', true, ${user.id}, NOW(), NOW()
          )
          RETURNING id
        `;
        
        await client.$queryRawUnsafe(salaryInsertQuery);

        // Create salary history record
        const historyInsertQuery = `
          INSERT INTO "salary_histories" (
            "employeeId", "changeType", "newBaseSalary", reason, "effectiveDate", "approvedBy", "createdAt"
          )
          VALUES (
            ${employee.id}, 'INITIAL', ${baseSalary}, 'Initial salary setup', '${salaryEffectiveDate}', ${user.id}, NOW()
          )
        `;
        
        await client.$queryRawUnsafe(historyInsertQuery);
      }

      return this.formatProfileResponse(employee);
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
    const client = this.prisma.getClient(tenantSlug);
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
    let whereClause = 'e."deletedAt" IS NULL';

    if (search) {
      whereClause += ` AND (e."firstName" ILIKE '%${search}%' OR e."lastName" ILIKE '%${search}%' OR e."position" ILIKE '%${search}%' OR e."department" ILIKE '%${search}%')`;
    }

    if (department) {
      whereClause += ` AND e."department" = '${department}'`;
    }

    if (employmentStatus) {
      whereClause += ` AND e."employmentStatus" = '${employmentStatus}'`;
    }

    if (isActive !== undefined) {
      whereClause += ` AND e."isActive" = ${isActive ? 'true' : 'false'}`;
    }

    if (managerId) {
      whereClause += ` AND e."managerId" = ${managerId}`;
    }

    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM "employees" e WHERE ${whereClause}`;
      const countResult = await client.$queryRawUnsafe(countQuery);
      const total = parseInt(countResult[0].count.toString());

      // Get employees with sorting and pagination, joined with users and current salary
      const query = `
        SELECT e.*, u.id as user_id, u.email, u.role, u."isActive" as user_is_active, u."createdAt" as user_created_at, u."updatedAt" as user_updated_at,
               s."baseSalary" as salary_base, s.allowances as salary_allowances
        FROM "employees" e
        LEFT JOIN "users" u ON e."userId" = u.id
        LEFT JOIN "salaries" s ON e.id = s."employeeId" AND s."isActive" = true AND s."endDate" IS NULL
        WHERE ${whereClause} 
        ORDER BY e."${sortField}" ${validSortOrder} 
        LIMIT ${limit} OFFSET ${offset}
      `;
      const employees = await client.$queryRawUnsafe(query);

      const data = employees.map((emp: any) => this.formatProfileResponse(emp, emp.user_id));
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
    const client = this.prisma.getClient(tenantSlug);

    const query = `
      SELECT e.*, u.id as user_id, u.email, u.role, u."isActive" as user_is_active, u."createdAt" as user_created_at, u."updatedAt" as user_updated_at,
             s."baseSalary" as salary_base, s.allowances as salary_allowances
      FROM "employees" e
      LEFT JOIN "users" u ON e."userId" = u.id
      LEFT JOIN "salaries" s ON e.id = s."employeeId" AND s."isActive" = true AND s."endDate" IS NULL
      WHERE e.id = ${Number(employeeId)} AND e."deletedAt" IS NULL
    `;
    const employees = await client.$queryRawUnsafe(query);

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    return this.formatProfileResponse(employees[0], employees[0].user_id);
  }

  /**
   * Find employee by user ID
   */
  async findByUserId(tenantSlug: string, userId: bigint) {
    const client = this.prisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE "userId" = ${userId} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      return null;
    }

    return employees[0];
  }

  /**
   * Update employee information
   * Handles salary changes by creating new salary records instead of updating employee table
   */
  async updateEmployee(
    tenantSlug: string,
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto,
    approvedBy?: number,
    userRole?: string,
  ): Promise<EmployeeProfileDto> {
    const client = this.prisma.getClient(tenantSlug);

    // Check email update authorization
    if (updateEmployeeDto.email !== undefined) {
      const allowedRoles = ['HR', 'ADMIN', 'SUPER'];
      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new BadRequestException('Only HR/ADMIN/SUPER users can update employee email');
      }
    }

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const employee = employees[0];
    const setClause: string[] = [];
    let hasSalaryChange = false;
    let oldBaseSalary = null;
    let newBaseSalary = null;
    let newAllowances = null;

    // Get current salary for comparison
    const currentSalaryResult = await client.$queryRaw`
      SELECT * FROM "salaries" 
      WHERE "employeeId" = ${Number(employeeId)} AND "isActive" = true AND "endDate" IS NULL
      LIMIT 1
    `;
    const currentSalary = currentSalaryResult?.[0];

    // Build dynamic update clause - exclude salary fields
    if (updateEmployeeDto.firstName !== undefined) {
      setClause.push(`"firstName" = '${updateEmployeeDto.firstName}'`);
    }
    if (updateEmployeeDto.lastName !== undefined) {
      setClause.push(`"lastName" = '${updateEmployeeDto.lastName}'`);
    }
    if (updateEmployeeDto.position !== undefined) {
      setClause.push(`"position" = '${updateEmployeeDto.position}'`);
    }
    if (updateEmployeeDto.department !== undefined) {
      setClause.push(`"department" = '${updateEmployeeDto.department}'`);
    }
    if (updateEmployeeDto.phoneNumber !== undefined) {
      setClause.push(`"phoneNumber" = '${updateEmployeeDto.phoneNumber}'`);
    }
    if (updateEmployeeDto.address !== undefined) {
      setClause.push(`"address" = '${updateEmployeeDto.address}'`);
    }
    if (updateEmployeeDto.managerId !== undefined) {
      setClause.push(`"managerId" = ${updateEmployeeDto.managerId || 'NULL'}`);
    }
    if (updateEmployeeDto.isActive !== undefined) {
      setClause.push(`"isActive" = ${updateEmployeeDto.isActive ? 'true' : 'false'}`);
    }

    // Handle email updates - update both employee and user table
    if (updateEmployeeDto.email !== undefined) {
      // Check if new email is already in use
      const existingUserQuery = `SELECT id FROM "users" WHERE email = '${updateEmployeeDto.email}' AND id != ${employee.userId}`;
      const existingUsers = await client.$queryRawUnsafe(existingUserQuery);
      if (existingUsers && existingUsers.length > 0) {
        throw new BadRequestException('Email already in use by another user');
      }

      // Update user email
      await client.$queryRawUnsafe(`UPDATE "users" SET email = '${updateEmployeeDto.email}', "updatedAt" = NOW() WHERE id = ${employee.userId}`);
    }

    // Handle salary changes separately
    if (updateEmployeeDto.baseSalary !== undefined || updateEmployeeDto.allowances !== undefined) {
      hasSalaryChange = true;
      oldBaseSalary = currentSalary?.baseSalary || null;
      newBaseSalary = updateEmployeeDto.baseSalary !== undefined ? updateEmployeeDto.baseSalary : oldBaseSalary;
      newAllowances = updateEmployeeDto.allowances !== undefined ? updateEmployeeDto.allowances : (currentSalary?.allowances || 0);

      // If there's an active salary, end it first
      if (currentSalary) {
        await client.$queryRawUnsafe(`
          UPDATE "salaries" 
          SET "endDate" = CURRENT_DATE, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${currentSalary.id}
        `);
      }

      // Create new salary record with effective date as today
      const today = new Date().toISOString().split('T')[0];
      const createdByValue = approvedBy ? approvedBy : 'NULL';
      await client.$queryRawUnsafe(`
        INSERT INTO "salaries" (
          "employeeId", "baseSalary", allowances, "effectiveDate", "isActive", "createdBy", "createdAt", "updatedAt"
        )
        VALUES (
          ${Number(employeeId)}, ${newBaseSalary}, ${newAllowances}, '${today}', true, ${createdByValue}, NOW(), NOW()
        )
      `);

      // Create salary history record
      const changeType = updateEmployeeDto.position !== undefined ? 'POSITION_CHANGE' : 'GRADE_ADJUSTMENT';
      const approvedByValue = approvedBy ? approvedBy : 'NULL';
      await client.$queryRawUnsafe(`
        INSERT INTO "salary_histories" (
          "employeeId", "changeType", "oldBaseSalary", "newBaseSalary", reason, "effectiveDate", "approvedBy", "createdAt"
        )
        VALUES (
          ${Number(employeeId)}, '${changeType}', ${oldBaseSalary || 'NULL'}, ${newBaseSalary}, 'Salary update', '${today}', ${approvedByValue}, NOW()
        )
      `);
    }

    setClause.push('"updatedAt" = NOW()');

    if (setClause.length === 1 && !hasSalaryChange) {
      // Only updatedAt
      return this.getEmployee(tenantSlug, employeeId);
    }

    if (setClause.length > 1 || hasSalaryChange) {
      await client.$queryRawUnsafe(`UPDATE "employees" SET ${setClause.join(', ')} WHERE id = ${Number(employeeId)}`);
    }

    return this.getEmployee(tenantSlug, employeeId);
  }

  /**
   * Soft delete employee
   */
  async deleteEmployee(tenantSlug: string, employeeId: string) {
    const client = this.prisma.getClient(tenantSlug);

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
    const client = this.prisma.getClient(tenantSlug);

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
    const client = this.prisma.getClient(tenantSlug);

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
    const client = this.prisma.getClient(tenantSlug);

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
    const client = this.prisma.getClient(tenantSlug);

    const employees = await client.$queryRaw`
      SELECT * FROM "employees" WHERE id = ${Number(employeeId)} AND "deletedAt" IS NULL
    `;

    if (!employees || employees.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const employee = employees[0];
    
    // Get manager
    let manager: any = null;
    if (employee.managerId) {
      const managerData = await client.$queryRaw`
        SELECT id, "firstName", "lastName", position, department FROM "employees" 
        WHERE id = ${employee.managerId} AND "deletedAt" IS NULL
      `;
      manager = managerData?.[0] || null;
    }

    // Get siblings (employees with same manager, excluding current employee)
    let siblings: any[] = [];
    if (employee.managerId) {
      siblings = await client.$queryRaw`
        SELECT id, "firstName", "lastName", position, department FROM "employees" 
        WHERE "managerId" = ${employee.managerId} AND id != ${employee.id} AND "deletedAt" IS NULL
        ORDER BY "firstName" ASC
      `;
    }

    // Get subordinates recursively
    const subordinates = await this.getSubordinatesRecursive(client, employee.id);

    return {
      manager: manager ? {
        id: manager.id.toString(),
        firstName: manager.firstName,
        lastName: manager.lastName,
        position: manager.position,
        department: manager.department,
      } : undefined,
      employee: {
        id: employee.id.toString(),
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        department: employee.department,
      },
      siblings: siblings.length > 0 ? siblings.map((s: any) => ({
        id: s.id.toString(),
        firstName: s.firstName,
        lastName: s.lastName,
        position: s.position,
        department: s.department,
      })) : undefined,
      subordinates: subordinates,
    };
  }

  /**
   * Get all subordinates recursively
   */
  private async getSubordinatesRecursive(client: any, employeeId: number): Promise<any[]> {
    const directSubordinates = await client.$queryRaw`
      SELECT id, "firstName", "lastName", position, department FROM "employees" 
      WHERE "managerId" = ${employeeId} AND "deletedAt" IS NULL 
      ORDER BY "firstName" ASC
    `;

    const allSubordinates: any[] = [];

    for (const subordinate of directSubordinates) {
      allSubordinates.push({
        id: subordinate.id.toString(),
        firstName: subordinate.firstName,
        lastName: subordinate.lastName,
        position: subordinate.position,
        department: subordinate.department,
      });

      // Recursively get subordinates of this subordinate
      const nestedSubordinates = await this.getSubordinatesRecursive(client, subordinate.id);
      allSubordinates.push(...nestedSubordinates);
    }

    return allSubordinates;
  }

  /**
   * Get management chain (manager -> manager's manager -> etc)
   */
  async getManagementChain(tenantSlug: string, employeeId: string) {
    const client = this.prisma.getClient(tenantSlug);

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
  private formatProfileResponse(employee: any, userId?: any): EmployeeProfileDto {
    const userData = userId ? {
      id: userId?.toString(),
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      isActive: employee.user_is_active,
      createdAt: new Date(employee.user_created_at),
      updatedAt: new Date(employee.user_updated_at),
    } : null;

    return {
      id: employee.id?.toString(),
      userId: employee.userId?.toString() || null,
      user: userData,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
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
      baseSalary: employee.salary_base ? Number(employee.salary_base) : (employee.baseSalary ? Number(employee.baseSalary) : null),
      allowances: employee.salary_allowances ? Number(employee.salary_allowances) : null,
      profilePicture: employee.profilePicture,
      managerId: employee.managerId ? Number(employee.managerId) : null,
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
   * Get employee profile with all details
   */
  async getProfile(tenantSlug: string, employeeId: number) {
    const client = this.prisma.getClient(tenantSlug);

    try {
      const query = `
        SELECT e.*, u.id as user_id, u.email, u.role, u."isActive" as user_is_active, u."createdAt" as user_created_at, u."updatedAt" as user_updated_at,
               s."baseSalary" as salary_base, s.allowances as salary_allowances
        FROM "employees" e
        LEFT JOIN "users" u ON e."userId" = u.id
        LEFT JOIN "salaries" s ON e.id = s."employeeId" AND s."isActive" = true AND s."endDate" IS NULL
        WHERE e.id = ${employeeId} AND e."deletedAt" IS NULL
      `;
      const employees = await client.$queryRawUnsafe(query);

      if (!employees || employees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      return this.formatProfileResponse(employees[0], employees[0].user_id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2010' && error.meta?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException('Your company/tenant is not exists');
      }
      throw new BadRequestException('Failed to fetch employee profile');
    }
  }

  /**
   * Update employee profile
   */
  async updateProfile(tenantSlug: string, employeeId: number, updateData: any) {
    const client = this.prisma.getClient(tenantSlug);

    try {
      // First verify employee exists
      const checkQuery = `SELECT id FROM "employees" WHERE id = ${employeeId} AND "deletedAt" IS NULL`;
      const employees = await client.$queryRawUnsafe(checkQuery);

      if (!employees || employees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      // Build the update query dynamically
      const allowedFields = [
        'firstName', 'lastName', 'employeeNumber', 'dateOfBirth', 'gender', 'maritalStatus',
        'nationality', 'religion', 'bloodType', 'idNumber', 'taxNumber', 'phoneNumber',
        'alternativePhone', 'address', 'city', 'province', 'postalCode',
        'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
        'bankName', 'bankAccountNumber', 'bankAccountName', 'position', 'department',
        'employmentStatus', 'contractStartDate', 'contractEndDate', 'workLocation', 'joinDate',
      ];

      const updates = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .filter(key => {
          const value = updateData[key];
          // Only include if value is not null, undefined, or empty string
          return value !== null && value !== undefined && value !== '';
        })
        .map(key => {
          const value = updateData[key];
          const escapedValue = `'${value.toString().replace(/'/g, "''")}'`;
          return `"${key}" = ${escapedValue}`;
        });

      if (updates.length === 0) {
        return this.getProfile(tenantSlug, employeeId);
      }

      const updateQuery = `
        UPDATE "employees" 
        SET ${updates.join(', ')}, "updatedAt" = NOW() 
        WHERE id = ${employeeId}
      `;

      await client.$queryRawUnsafe(updateQuery);
      return this.getProfile(tenantSlug, employeeId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2010' && error.meta?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException('Your company/tenant is not exists');
      }
      // Log the actual error for debugging
      console.error('Profile update error:', error);
      throw new BadRequestException(
        error.message || 'Failed to update employee profile',
      );
    }
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(tenantSlug: string, employeeId: number, filename: string) {
    const client = this.prisma.getClient(tenantSlug);

    try {
      // First verify employee exists
      const checkQuery = `SELECT id FROM "employees" WHERE id = ${employeeId} AND "deletedAt" IS NULL`;
      const employees = await client.$queryRawUnsafe(checkQuery);

      if (!employees || employees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      const fileUrl = `/uploads/profiles/${filename}`;
      const updateQuery = `UPDATE "employees" SET "profilePicture" = '${fileUrl}', "updatedAt" = NOW() WHERE id = ${employeeId}`;

      await client.$queryRawUnsafe(updateQuery);

      return {
        url: fileUrl,
        filename: filename,
        message: 'Profile picture uploaded successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2010' && error.meta?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException('Your company/tenant is not exists');
      }
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(tenantSlug: string, employeeId: number) {
    const client = this.prisma.getClient(tenantSlug);

    try {
      // First verify employee exists
      const checkQuery = `SELECT id, "profilePicture" FROM "employees" WHERE id = ${employeeId} AND "deletedAt" IS NULL`;
      const employees = await client.$queryRawUnsafe(checkQuery);

      if (!employees || employees.length === 0) {
        throw new NotFoundException(`Employee with ID ${employeeId} not found`);
      }

      const updateQuery = `UPDATE "employees" SET "profilePicture" = NULL, "updatedAt" = NOW() WHERE id = ${employeeId}`;
      await client.$queryRawUnsafe(updateQuery);

      return { message: 'Profile picture deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.code === 'P2010' && error.meta?.kind === 'DatabaseDoesNotExist') {
        throw new NotFoundException('Your company/tenant is not exists');
      }
      throw new BadRequestException('Failed to delete profile picture');
    }
  }
}
