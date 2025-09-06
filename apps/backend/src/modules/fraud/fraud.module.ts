import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { FraudProcessor } from './fraud.processor';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'fraud-detection',
    }),
    TransactionsModule,
  ],
  controllers: [FraudController],
  providers: [FraudService, FraudProcessor],
  exports: [FraudService],
})
export class FraudModule {}