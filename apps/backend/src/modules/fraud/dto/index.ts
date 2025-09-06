import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsUUID, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AlertType {
  FRAUD = 'FRAUD',
  VELOCITY = 'VELOCITY',
  DEVICE_CHANGE = 'DEVICE_CHANGE',
  UNUSUAL_LOCATION = 'UNUSUAL_LOCATION',
  HIGH_RISK_MERCHANT = 'HIGH_RISK_MERCHANT',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  ESCALATED = 'ESCALATED',
}

export class TriageRequestDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AlertQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: AlertType })
  @IsOptional()
  @IsEnum(AlertType)
  type?: AlertType;

  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  skip?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  take?: number = 50;
}

export class UpdateAlertDto {
  @ApiProperty({ enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  triageData?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}