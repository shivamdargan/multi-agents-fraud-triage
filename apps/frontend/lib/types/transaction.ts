export interface Transaction {
  id: string;
  customerId: string;
  cardId: string;
  mcc: string;
  merchant: string;
  amount: number;
  currency: string;
  timestamp: string;
  deviceId?: string;
  geo?: {
    lat: number;
    lon: number;
    country: string;
  };
  riskScore?: number;
  status: TransactionStatus;
  customer?: Customer;
  card?: Card;
}

export interface Customer {
  id: string;
  name: string;
  emailMasked: string;
  riskFlags?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  customerId: string;
  last4: string;
  status: CardStatus;
  network: string;
  createdAt: string;
  updatedAt: string;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  FLAGGED = 'FLAGGED',
}

export enum CardStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CANCELLED = 'CANCELLED',
}

export interface TransactionQuery {
  customerId?: string;
  cardId?: string;
  mcc?: string;
  merchant?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  skip?: number;
  take?: number;
}

export interface TransactionStats {
  summary: {
    total: number;
    average: number;
    count: number;
    min: number;
    max: number;
  };
  categoryBreakdown: Array<{
    mcc: string;
    _sum: { amount: number };
    _count: number;
  }>;
  topMerchants: Array<{
    merchant: string;
    _sum: { amount: number };
    _count: number;
  }>;
}