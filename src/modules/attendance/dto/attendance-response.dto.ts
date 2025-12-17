import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ example: -6.2088 })
  latitude: number;

  @ApiProperty({ example: 106.8456 })
  longitude: number;

  @ApiProperty({ example: 'Jl. Sudirman No. 1, Jakarta' })
  address?: string;
}

export class AttendanceLogResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: 'CLOCK_IN', enum: ['CLOCK_IN', 'CLOCK_OUT'] })
  type: 'CLOCK_IN' | 'CLOCK_OUT';

  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ type: LocationDto })
  location: LocationDto;

  @ApiProperty({ example: '192.168.1.1', required: false })
  ipAddress?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  userAgent?: string;

  @ApiProperty({ example: 'Starting work for the day', required: false })
  notes?: string;

  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' })
  createdAt: string;
}

export class AttendanceResponseDto {
  @ApiProperty({ example: '1' })
  id: string;

  @ApiProperty({ example: '1' })
  employeeId: string;

  @ApiProperty({ example: '1' })
  attendancePeriodId: string;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z' })
  date: string;

  @ApiProperty({ example: '2024-01-15T08:00:00.000Z', required: false })
  checkIn?: string;

  @ApiProperty({ example: '2024-01-15T17:00:00.000Z', required: false })
  checkOut?: string;

  @ApiProperty({ type: LocationDto, required: false })
  checkInLocation?: LocationDto;

  @ApiProperty({ type: LocationDto, required: false })
  checkOutLocation?: LocationDto;

  @ApiProperty({ example: 480, description: 'Work duration in minutes', required: false })
  workDuration?: number;

  @ApiProperty({ example: 'PRESENT', enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] })
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

  @ApiProperty({ example: 'Normal working day', required: false })
  notes?: string;

  @ApiProperty({ example: '2024-01-15T08:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-15T17:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ type: [AttendanceLogResponseDto], required: false })
  logs?: AttendanceLogResponseDto[];
}

export class ClockActionResponseDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({ example: 'Successfully clocked in' })
  message: string;

  @ApiProperty({ type: AttendanceLogResponseDto })
  log: AttendanceLogResponseDto;

  @ApiProperty({ type: AttendanceResponseDto })
  attendance: AttendanceResponseDto;
}