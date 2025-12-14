# Employee API - Usage Examples

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## 1. Create Employee

### Request
```bash
curl -X POST http://localhost:3000/my-company/employees \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@mycompany.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "position": "Senior Developer",
    "department": "Engineering",
    "joinDate": "2024-01-15T00:00:00Z",
    "dateOfBirth": "1990-05-20T00:00:00Z",
    "gender": "MALE",
    "maritalStatus": "MARRIED",
    "nationality": "Indonesian",
    "phoneNumber": "+62812345678",
    "address": "Jl. Sudirman No. 123",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postalCode": "12190",
    "bankName": "Bank Indonesia",
    "bankAccountNumber": "1234567890",
    "bankAccountName": "John Doe",
    "employmentStatus": "PERMANENT",
    "contractStartDate": "2024-01-15T00:00:00Z",
    "workLocation": "Jakarta Office",
    "baseSalary": 75000000
  }'
```

### Response
```json
{
  "id": "1",
  "userId": "1",
  "firstName": "John",
  "lastName": "Doe",
  "position": "Senior Developer",
  "department": "Engineering",
  "joinDate": "2024-01-15T00:00:00.000Z",
  "employeeNumber": null,
  "dateOfBirth": "1990-05-20T00:00:00.000Z",
  "gender": "MALE",
  "maritalStatus": "MARRIED",
  "nationality": "Indonesian",
  "religion": null,
  "bloodType": null,
  "phoneNumber": "+62812345678",
  "alternativePhone": null,
  "address": "Jl. Sudirman No. 123",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postalCode": "12190",
  "bankName": "Bank Indonesia",
  "bankAccountNumber": "1234567890",
  "bankAccountName": "John Doe",
  "employmentStatus": "PERMANENT",
  "contractStartDate": "2024-01-15T00:00:00.000Z",
  "contractEndDate": null,
  "workLocation": "Jakarta Office",
  "baseSalary": 75000000,
  "managerId": null,
  "isActive": true,
  "createdAt": "2024-12-14T12:15:00.000Z",
  "updatedAt": "2024-12-14T12:15:00.000Z"
}
```

## 2. Create Another Employee (for Manager Assignment)

```bash
curl -X POST http://localhost:3000/my-company/employees \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.smith@mycompany.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "position": "Developer",
    "department": "Engineering",
    "joinDate": "2024-02-01T00:00:00Z"
  }'
```

Response: Employee with id: 2

## 3. Get All Employees with Pagination

### Simple Get
```bash
curl http://localhost:3000/my-company/employees \
  -H "Authorization: Bearer <jwt_token>"
```

### With Filters
```bash
curl "http://localhost:3000/my-company/employees?page=1&limit=10&department=Engineering&isActive=true&sortBy=firstName&sortOrder=asc" \
  -H "Authorization: Bearer <jwt_token>"
```

### With Search
```bash
curl "http://localhost:3000/my-company/employees?search=john&department=Engineering" \
  -H "Authorization: Bearer <jwt_token>"
```

### Response
```json
{
  "data": [
    {
      "id": "1",
      "userId": "1",
      "firstName": "John",
      "lastName": "Doe",
      "position": "Senior Developer",
      "department": "Engineering",
      ...more fields...
    },
    {
      "id": "2",
      "userId": "2",
      "firstName": "Jane",
      "lastName": "Smith",
      "position": "Developer",
      "department": "Engineering",
      ...more fields...
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 2,
  "pages": 1
}
```

## 4. Get Single Employee Details

```bash
curl http://localhost:3000/my-company/employees/1 \
  -H "Authorization: Bearer <jwt_token>"
```

Response: Complete employee profile (same as create response)

## 5. Update Employee

```bash
curl -X PUT http://localhost:3000/my-company/employees/1 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "Lead Developer",
    "baseSalary": 85000000,
    "workLocation": "Jakarta Office - Floor 5"
  }'
```

Response: Updated employee profile

## 6. Set Employee Manager

Assign Jane (ID: 2) to report to John (ID: 1):

```bash
curl -X PUT http://localhost:3000/my-company/employees/2/manager \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "managerId": 1
  }'
```

Response: Jane's profile with managerId set to 1

## 7. Get Employee Subordinates

Get all employees reporting to John (ID: 1):

```bash
curl http://localhost:3000/my-company/employees/1/subordinates \
  -H "Authorization: Bearer <jwt_token>"
```

### Response
```json
[
  {
    "id": "2",
    "firstName": "Jane",
    "lastName": "Smith",
    "position": "Developer",
    "department": "Engineering",
    "managerId": 1,
    ...more fields...
  }
]
```

## 8. Get Organization Tree

Get complete organizational structure under John (ID: 1):

```bash
curl http://localhost:3000/my-company/employees/1/organization-tree \
  -H "Authorization: Bearer <jwt_token>"
```

### Response
```json
{
  "id": "1",
  "firstName": "John",
  "lastName": "Doe",
  "position": "Senior Developer",
  "department": "Engineering",
  "subordinates": [
    {
      "id": "2",
      "firstName": "Jane",
      "lastName": "Smith",
      "position": "Developer",
      "department": "Engineering",
      "subordinates": [
        {
          "id": "3",
          "firstName": "Bob",
          "lastName": "Johnson",
          "position": "Junior Developer",
          "department": "Engineering",
          "subordinates": []
        }
      ]
    }
  ]
}
```

## 9. Get Management Chain

Get the chain of command for Jane (ID: 2):

```bash
curl http://localhost:3000/my-company/employees/2/management-chain \
  -H "Authorization: Bearer <jwt_token>"
```

### Response
```json
[
  {
    "id": "2",
    "firstName": "Jane",
    "lastName": "Smith",
    "position": "Developer",
    "department": "Engineering",
    "managerId": 1,
    ...
  },
  {
    "id": "1",
    "firstName": "John",
    "lastName": "Doe",
    "position": "Senior Developer",
    "department": "Engineering",
    "managerId": null,
    ...
  }
]
```

## 10. Update Employee (Partial)

Update only specific fields:

```bash
curl -X PUT http://localhost:3000/my-company/employees/1 \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+62812345679",
    "city": "Bandung"
  }'
```

## 11. Soft Delete Employee

```bash
curl -X DELETE http://localhost:3000/my-company/employees/1 \
  -H "Authorization: Bearer <jwt_token>"
```

Response: Employee profile with deletedAt timestamp set

## 12. Restore Deleted Employee

```bash
curl -X PATCH http://localhost:3000/my-company/employees/1/restore \
  -H "Authorization: Bearer <jwt_token>"
```

Response: Employee profile with deletedAt set to null

## 13. Advanced Filtering Examples

### Get Only Active Employees
```bash
curl "http://localhost:3000/my-company/employees?isActive=true" \
  -H "Authorization: Bearer <jwt_token>"
```

### Get Permanent Employees Only
```bash
curl "http://localhost:3000/my-company/employees?employmentStatus=PERMANENT" \
  -H "Authorization: Bearer <jwt_token>"
```

### Get Employees by Manager
```bash
curl "http://localhost:3000/my-company/employees?managerId=1" \
  -H "Authorization: Bearer <jwt_token>"
```

### Search and Sort
```bash
curl "http://localhost:3000/my-company/employees?search=john&sortBy=joinDate&sortOrder=desc" \
  -H "Authorization: Bearer <jwt_token>"
```

### Pagination
```bash
curl "http://localhost:3000/my-company/employees?page=2&limit=20" \
  -H "Authorization: Bearer <jwt_token>"
```

## Query Parameters Reference

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (1-based) |
| limit | number | 10 | Items per page (1-100) |
| search | string | "John" | Search by name, position, department |
| department | string | "Engineering" | Filter by department |
| employmentStatus | string | "PERMANENT" | Filter by status |
| isActive | boolean | true | Filter by active status |
| managerId | number | 1 | Filter by manager ID |
| sortBy | string | "firstName" | Sort field |
| sortOrder | string | "asc" | Sort direction (asc/desc) |

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "User with this email already exists",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Employee not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Workflow Examples

### Create Organizational Hierarchy

1. Create CEO
```bash
POST /my-company/employees
{
  "email": "ceo@company.com",
  "firstName": "Alice",
  "lastName": "CEO",
  "position": "CEO",
  "department": "Executive",
  "joinDate": "2020-01-01T00:00:00Z"
}
# Response: id = 1
```

2. Create Engineering Manager
```bash
POST /my-company/employees
{
  "email": "eng-manager@company.com",
  "firstName": "Bob",
  "lastName": "Manager",
  "position": "Engineering Manager",
  "department": "Engineering",
  "joinDate": "2021-06-01T00:00:00Z"
}
# Response: id = 2
```

3. Assign Engineering Manager to CEO
```bash
PUT /my-company/employees/2/manager
{
  "managerId": 1
}
```

4. Create Developer
```bash
POST /my-company/employees
{
  "email": "dev@company.com",
  "firstName": "Charlie",
  "lastName": "Dev",
  "position": "Developer",
  "department": "Engineering",
  "joinDate": "2023-01-01T00:00:00Z"
}
# Response: id = 3
```

5. Assign Developer to Engineering Manager
```bash
PUT /my-company/employees/3/manager
{
  "managerId": 2
}
```

6. View Full Organization Tree
```bash
GET /my-company/employees/1/organization-tree
```

Returns:
```json
{
  "id": "1",
  "firstName": "Alice",
  "lastName": "CEO",
  "subordinates": [
    {
      "id": "2",
      "firstName": "Bob",
      "lastName": "Manager",
      "subordinates": [
        {
          "id": "3",
          "firstName": "Charlie",
          "lastName": "Dev",
          "subordinates": []
        }
      ]
    }
  ]
}
```

## Tips & Best Practices

1. **Always include Content-Type header** when sending JSON
2. **Use pagination** for large result sets (limit max 100)
3. **Use search** instead of fetching all and filtering client-side
4. **Check managerId is valid** before setting manager
5. **Soft deletes preserve data** - use restore if needed
6. **BigInt IDs** are returned as strings in JSON for compatibility
7. **Timestamps** are always in ISO 8601 format (UTC)

