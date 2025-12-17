import { ApiProperty } from '@nestjs/swagger';

export class SchedulerStatsResponseDto {
  @ApiProperty({ example: 3, description: 'Total number of active periods' })
  totalActive: number;

  @ApiProperty({ example: 2, description: 'Total number of inactive periods' })
  totalInactive: number;

  @ApiProperty({ example: 1, description: 'Currently valid active periods' })
  currentlyValidActive: number;

  @ApiProperty({ example: 0, description: 'Expired periods that are still marked as active' })
  expiredButStillActive: number;

  @ApiProperty({ example: 0, description: 'Periods that should be active but are marked as inactive' })
  shouldBeActiveButInactive: number;

  @ApiProperty({ example: '2025-12-06T11:05:53.000Z', description: 'Last time the check was performed' })
  lastChecked: Date;
}

export class SchedulerRunResponseDto {
  @ApiProperty({ example: 'success', description: 'Operation status' })
  status: string;

  @ApiProperty({ example: 'Period status check completed', description: 'Response message' })
  message: string;

  @ApiProperty({ example: '2025-12-06T11:05:53.000Z', description: 'Timestamp when check was performed' })
  timestamp: Date;
}

export class SchedulerStatsWrapperDto {
  @ApiProperty({ example: 'success', description: 'Operation status' })
  status: string;

  @ApiProperty({ type: SchedulerStatsResponseDto, description: 'Scheduler statistics data' })
  data: SchedulerStatsResponseDto;
}