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
    refetchInterval: 6000, // Refetch every 6 seconds for live updates
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
    staleTime: 0, // Always consider data stale to ensure fresh updates
  });
}