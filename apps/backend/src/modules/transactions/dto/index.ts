import { IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  FLAGGED = 'FLAGGED',
}

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  cardId: string;

  @ApiProperty()
  @IsString()
  mcc: string;

  @ApiProperty()
  @IsString()
  merchant: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiProperty()
  @IsDateString()
  timestamp: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  geo?: {
    lat: number;
    lon: number;
    country: string;
  };
}

export class UploadTransactionsDto {
  @ApiProperty({ type: [CreateTransactionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionDto)
  transactions: CreateTransactionDto[];
}

export class TransactionQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cardId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mcc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  merchant?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

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
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  skip?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  take?: number = 100;
}