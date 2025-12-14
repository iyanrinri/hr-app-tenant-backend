# Employee Management System - Features & Implementation

## Overview

This document outlines all the features implemented in the employee management system for the multi-tenant HR application.

## 1. Core Features Implemented

### ✅ Employee CRUD Operations

#### Create Employee
- **Endpoint**: `POST /:tenant_slug/employees`
- **Features**:
  - Auto-generates user account when creating employee
  - Accepts email and password (or generates default)
  - Creates both user and employee records in single transaction
  - Supports comprehensive personal, contact, and employment information

#### Get All Employees
- **Endpoint**: `GET /:tenant_slug/employees`
- **Features**:
  - Pagination support (page, limit)
  - Advanced filtering:
    - Search by name, position, or department
    - Filter by department
    - Filter by employment status
    - Filter by active status
    - Filter by manager ID
  - Sorting (sortBy, sortOrder)
  - Returns paginated response with metadata

#### Get Single Employee
- **Endpoint**: `GET /:tenant_slug/employees/:id`
- **Features**:
  - Returns complete employee profile with all details
  - Includes all personal, contact, bank, and employment information

#### Update Employee
- **Endpoint**: `PUT /:tenant_slug/employees/:id`
- **Features**:
  - Update any employee field
  - Optional fields for partial updates
  - Includes hierarchy field updates (managerId)

#### Delete Employee
- **Endpoint**: `DELETE /:tenant_slug/employees/:id`
- **Features**:
  - Soft delete (sets deletedAt timestamp)
  - Employee record remains in database for audit purposes

#### Restore Employee
- **Endpoint**: `PATCH /:tenant_slug/employees/:id/restore`
- **Features**:
  - Restores soft-deleted employee records
  - Clears deletedAt timestamp

### ✅ Hierarchy Management

#### Set Manager
- **Endpoint**: `PUT /:tenant_slug/employees/:id/manager`
- **Features**:
  - Assigns a manager to an employee
  - Validates manager exists
  - Prevents self-assignment
  - Supports organizational hierarchy

#### Get Direct Subordinates
- **Endpoint**: `GET /:tenant_slug/employees/:id/subordinates`
- **Features**:
  - Retrieves all direct reports
  - Returns list of subordinate employees
  - Useful for manager views

#### Get Organization Tree
- **Endpoint**: `GET /:tenant_slug/employees/:id/organization-tree`
- **Features**:
  - Returns complete org tree starting from employee
  - Includes all subordinates recursively
  - Shows hierarchical structure

#### Get Management Chain
- **Endpoint**: `GET /:tenant_slug/employees/:id/management-chain`
- **Features**:
  - Returns chain of command (manager → manager's manager → etc.)
  - Useful for permission chains and escalations

## 2. Employee Fields

### Basic Information
- firstName (required)
- lastName (required)
- position (required)
- department (required)
- joinDate (required)

### Personal Information
- employeeNumber
- dateOfBirth
- gender (MALE, FEMALE, OTHER)
- maritalStatus (SINGLE, MARRIED, DIVORCED, WIDOWED)
- nationality
- religion
- bloodType
- idNumber (unique)
- taxNumber (unique)

### Contact Information
- phoneNumber
- alternativePhone
- address
- city
- province
- postalCode
- emergencyContactName
- emergencyContactPhone
- emergencyContactRelation

### Bank Information
- bankName
- bankAccountNumber
- bankAccountName

### Employment Details
- employmentStatus (PERMANENT, CONTRACT, TEMPORARY, INTERNSHIP)
- contractStartDate
- contractEndDate
- workLocation
- baseSalary

### Profile & Hierarchy
- profilePicture (URL/path)
- managerId (for hierarchy)

### Status & Audit
- isActive (boolean, default: true)
- deletedAt (for soft deletes)
- createdAt
- updatedAt

## 3. API Request/Response Examples

### Create Employee
```json
POST /tenant-slug/employees
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "position": "Senior Developer",
  "department": "Engineering",
  "joinDate": "2024-01-15T00:00:00Z",
  "dateOfBirth": "1990-01-15T00:00:00Z",
  "gender": "MALE",
  "phoneNumber": "+62812345678",
  "address": "Jl. Example No. 123",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "baseSalary": 75000000
}
```

### Get All Employees with Filters
```
GET /tenant-slug/employees?page=1&limit=10&department=Engineering&isActive=true&sortBy=firstName&sortOrder=asc
```

### Set Manager
```json
PUT /tenant-slug/employees/2/manager
{
  "managerId": 1
}
```

### Get Organization Tree
```
GET /tenant-slug/employees/1/organization-tree
Response: {
  "id": "1",
  "firstName": "John",
  "lastName": "Doe",
  "position": "Manager",
  "department": "Engineering",
  "subordinates": [
    {
      "id": "2",
      "firstName": "Jane",
      "lastName": "Smith",
      "position": "Developer",
      "department": "Engineering",
      "subordinates": []
    }
  ]
}
```

## 4. Database Schema

### Employees Table
```sql
CREATE TABLE "employees" (
  "id" BIGSERIAL PRIMARY KEY,
  "userId" BIGINT UNIQUE,
  "managerId" BIGINT (FOREIGN KEY to employees.id),
  
  -- Basic Info
  "firstName" TEXT,
  "lastName" TEXT,
  "position" TEXT,
  "department" TEXT,
  "joinDate" TIMESTAMP,
  
  -- Personal Info (all optional)
  "employeeNumber" TEXT UNIQUE,
  "dateOfBirth" TIMESTAMP,
  "gender" TEXT,
  "maritalStatus" TEXT,
  "nationality" TEXT,
  "religion" TEXT,
  "bloodType" TEXT,
  "idNumber" TEXT UNIQUE,
  "taxNumber" TEXT UNIQUE,
  
  -- Contact Info (all optional)
  "phoneNumber" TEXT,
  "alternativePhone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "province" TEXT,
  "postalCode" TEXT,
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "emergencyContactRelation" TEXT,
  
  -- Bank Info (all optional)
  "bankName" TEXT,
  "bankAccountNumber" TEXT,
  "bankAccountName" TEXT,
  
  -- Employment (all optional)
  "employmentStatus" TEXT,
  "contractStartDate" TIMESTAMP,
  "contractEndDate" TIMESTAMP,
  "workLocation" TEXT,
  "baseSalary" NUMERIC(15,2),
  
  -- Profile
  "profilePicture" TEXT,
  
  -- Status & Audit
  "isActive" BOOLEAN DEFAULT true,
  "deletedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX employees_firstName_idx ON employees(firstName);
CREATE INDEX employees_lastName_idx ON employees(lastName);
CREATE INDEX employees_position_idx ON employees(position);
CREATE INDEX employees_department_idx ON employees(department);
CREATE INDEX employees_managerId_idx ON employees(managerId);
CREATE INDEX employees_isActive_idx ON employees(isActive);
CREATE INDEX employees_deletedAt_idx ON employees(deletedAt);
```

## 5. DTOs Overview

### Create Employee DTO
Includes all fields with email/password for user auto-creation

### Update Employee DTO
All fields optional for partial updates

### Find All Employees DTO
Query parameters for filtering and pagination

### Employee Profile DTO
Complete employee profile response

### Set Manager DTO
Contains managerId for hierarchy assignment

### Organization Tree DTO
Hierarchical structure for org tree response

### Paginated Employee Response DTO
Wrapper with pagination metadata

## 6. Service Methods

### Public Methods
- `createEmployee()` - Create new employee with user account
- `getEmployees()` - Get paginated list with filters
- `getEmployee()` - Get single employee details
- `updateEmployee()` - Update employee information
- `deleteEmployee()` - Soft delete employee
- `restoreEmployee()` - Restore deleted employee
- `setManager()` - Assign manager to employee
- `getSubordinates()` - Get direct reports
- `getOrganizationTree()` - Get org tree recursively
- `getManagementChain()` - Get chain of command
- `findByUserId()` - Get employee by user ID

### Helper Methods
- `formatProfileResponse()` - Format raw DB data to DTO
- `generateDefaultPassword()` - Generate random password
- `buildOrganizationTree()` - Build org tree recursively

## 7. Key Implementation Details

### Multi-Tenant Architecture
- Uses separate database per tenant
- Each tenant has their own employees table
- PrismaPg client with dynamic connection URLs

### Raw SQL Approach
- Uses raw SQL queries for tenant database operations
- Avoids schema mismatch issues between master and tenant DBs
- Transactions for atomic operations

### Soft Delete Pattern
- Uses `deletedAt` field instead of `isDeleted` flag
- Deleted records remain in database for audit
- Can be restored later

### Hierarchy Support
- Self-referential `managerId` field
- Recursive queries for organization tree
- Efficient subordinate lookups

### Pagination & Filtering
- Offset-based pagination
- Multi-field search
- Multiple filter criteria
- Customizable sorting

## 8. Architecture

```
employees.controller.ts
    ↓
employees.service.ts (Business Logic)
    ↓
EmployeePrismaService (Database Access)
    ↓
PostgreSQL (Tenant Database)
```

### Data Flow
1. Request comes to controller
2. Controller calls service method
3. Service builds raw SQL query
4. PrismaPrisma client executes query
5. Response formatted as DTO
6. JSON response sent to client

## 9. Features Not Yet Implemented

These features from the old HR backend are pending:
- ❌ Profile picture upload/storage
- ❌ Role-based access control (RBAC)
- ❌ Salary integration with salary slips
- ❌ Leave management
- ❌ Performance reviews
- ❌ Training records
- ❌ File attachments

## 10. Security Considerations

### Current Implementation
- JWT authentication required on all endpoints
- Tenant slug parameter prevents cross-tenant access
- Soft delete for audit trail

### Recommended Additions
- Role-based authorization (HR only can create/delete)
- Field-level encryption for sensitive data (SSN, tax number)
- Audit logging for all operations
- Rate limiting on API endpoints

## 11. Testing Recommendations

### Unit Tests
- Service method business logic
- DTO validation
- Error handling

### Integration Tests
- Employee creation with user account
- Hierarchy operations
- Filtering and pagination
- Soft delete/restore

### API Tests
- Endpoint responses
- Error cases
- Authorization checks

## 12. Performance Optimizations

### Current
- Indexed frequently queried fields
- Pagination to limit result sets

### Possible Improvements
- Database query caching
- Lazy loading of subordinates
- Batch operations for bulk updates
- Search optimization with full-text search

## 13. Migration Notes

### From Old System
- Changed from soft delete `isDeleted: false` to `deletedAt: null` pattern
- Added `managerId` for hierarchy instead of separate manager table
- Using raw SQL instead of Prisma ORM for tenant databases
- Added comprehensive personal/contact/bank fields to single Employee model

