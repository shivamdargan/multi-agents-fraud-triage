import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface DashboardMetrics {
  totalTransactions: number;
  totalAlerts: number;
  activeAlerts: number;
  fraudRate: number;
  avgResponseTime: number;
  falsePositiveRate: number;
  recentAlerts: Array<{
    id: string;
    customerId: string;
    customerName: string;
    type: string;
    severity: string;
    status: string;
    amount: number;
    timestamp: string;
    description: string;
    metadata: any;
  }>;
}

export function useDashboardMetrics(dateRange?: { startDate?: string; endDate?: string }) {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await apiClient.get<DashboardMetrics>(
        `/dashboard/metrics${params.toString() ? `?${params.toString()}` : ''}`
      );
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}