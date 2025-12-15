import { IsArray, IsNotEmpty, ArrayNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubordinatesDto {
  @ApiProperty({ 
    example: [123, 456, 789],
    description: 'Array of employee IDs to assign as subordinates. Use empty array to remove all subordinates'
  })
  @IsArray()
  @IsNumber({}, { each: true })
  subordinateIds: number[];
}

export class SetManagerDto {
  @ApiProperty({ 
    example: 456,
    description: 'Employee ID of the manager. Set to null to remove manager'
  })
  @IsOptional()
  @IsNumber()
  managerId?: number;
}

export class EmployeeHierarchyResponseDto {
  @ApiProperty({ example: 123 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'Software Engineer' })
  position: string;

  @ApiProperty({ example: 'Engineering' })
  department: string;

  @ApiProperty({ example: 456, nullable: true })
  managerId?: number;
}

export class OrganizationTreeDto {
  @ApiProperty({ type: EmployeeHierarchyResponseDto, nullable: true })
  manager?: EmployeeHierarchyResponseDto;

  @ApiProperty({ type: EmployeeHierarchyResponseDto })
  employee: EmployeeHierarchyResponseDto;

  @ApiProperty({ type: [EmployeeHierarchyResponseDto] })
  subordinates: EmployeeHierarchyResponseDto[];

  @ApiProperty({ type: [EmployeeHierarchyResponseDto] })
  siblings: EmployeeHierarchyResponseDto[];

  @ApiProperty({ type: [EmployeeHierarchyResponseDto] })
  managementChain: EmployeeHierarchyResponseDto[];
}