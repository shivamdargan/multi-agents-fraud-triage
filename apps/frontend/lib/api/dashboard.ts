import apiClient from '../api-client';

export interface DashboardMetrics {
  totalTransactions: number;
  totalAlerts: number;
  activeAlerts: number;
  fraudRate: number;
  avgResponseTime: number;
  falsePositiveRate: number;
  recentAlerts: Alert[];
}

export interface Alert {
  id: string;
  customerId: string;
  customerName: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
  amount?: number;
  timestamp: string;
  description: string;
  metadata?: Record<string, any>;
}

export const dashboardApi = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    const { data } = await apiClient.get('/dashboard/metrics');
    return data;
  },

  getRecentAlerts: async (limit = 10): Promise<Alert[]> => {
    const { data } = await apiClient.get('/alerts/recent', {
      params: { limit }
    });
    return data;
  },

  getAlertStats: async () => {
    const { data } = await apiClient.get('/alerts/stats');
    return data;
  }
};