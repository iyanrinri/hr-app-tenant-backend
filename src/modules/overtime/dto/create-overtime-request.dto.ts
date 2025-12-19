import { IsString, IsNotEmpty, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOvertimeRequestDto {
  @ApiProperty({ 
    example: 123,
    description: 'Employee ID submitting the overtime request'
  })
  @IsNumber()
  @IsNotEmpty()
  employeeId: number;

  @ApiProperty({ 
    example: '2024-12-12',
    description: 'Date of the overtime work'
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ 
    example: '2024-12-12T18:00:00Z',
    description: 'Start time of overtime work'
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ 
    example: '2024-12-12T21:00:00Z',
    description: 'End time of overtime work'
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ 
    example: 'System deployment and maintenance work',
    description: 'Reason for overtime work'
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
