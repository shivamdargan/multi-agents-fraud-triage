export interface SpendInsights {
  customerId: string;
  period: string;
  summary: {
    totalSpend: number;
    averageTransaction: number;
    transactionCount: number;
    uniqueMerchants: number;
  };
  trends: {
    spendTrend: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
    comparisonPeriod: string;
  };
  categories: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    amount: number;
    count: number;
  }>;
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface Report {
  id: string;
  customerId: string;
  type: ReportType;
  status: ReportStatus;
  content?: any;
  generatedAt: string;
  expiresAt: string;
  downloadUrl?: string;
}

export enum ReportType {
  MONTHLY_SPEND = 'MONTHLY_SPEND',
  FRAUD_ANALYSIS = 'FRAUD_ANALYSIS',
  TRANSACTION_SUMMARY = 'TRANSACTION_SUMMARY',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}