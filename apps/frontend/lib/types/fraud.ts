export interface Alert {
  id: string;
  customerId: string;
  type: AlertType;
  severity: AlertSeverity;
  riskScore: number;
  reasons: string[];
  status: AlertStatus;
  metadata?: any;
  triageData?: any;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  customer?: any;
}

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

export interface AlertQuery {
  customerId?: string;
  type?: string;
  severity?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  take?: number;
}

export interface TriageResult {
  sessionId: string;
  result: {
    customerId: string;
    transactionId?: string;
    riskScore: number;
    decision: string;
    signals: RiskSignals;
    recommendations: string[];
    timestamp: string;
  };
  duration: number;
}

export interface RiskSignals {
  overallRisk: number;
  signals: {
    velocity: {
      score: number;
      transactionCount: number;
      totalAmount: number;
    };
    devices: {
      score: number;
      totalDevices: number;
      untrustedDevices: number;
    };
    history: {
      score: number;
      chargebackCount: number;
      alertCount: number;
    };
  };
  recommendations: string[];
}

export interface TriageProgress {
  type: 'start' | 'progress' | 'complete' | 'error';
  message: string;
  step?: number;
  result?: any;
  error?: string;
  sessionId?: string;
  duration?: number;
}