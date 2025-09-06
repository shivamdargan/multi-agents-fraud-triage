import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  riskLevel: string;
  createdAt: string;
  lastActivity: string;
  totalTransactions: number;
  totalSpent: number;
  cards?: any[];
  transactions?: any[];
}

export function useCustomers(params?: {
  search?: string;
  riskLevel?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<Customer[]>({
    queryKey: ['customers', params],
    queryFn: async () => {
      // The API client interceptor already extracts the data array
      const response = await apiClient.get<Customer[]>('/customers', {
        params: {
          search: params?.search,
          riskLevel: params?.riskLevel,
          limit: params?.limit || 100,
          offset: params?.offset || 0,
        },
      });
      return response;
    },
    staleTime: 60 * 1000, // Consider data stale after 1 minute
  });
}

export function useCustomer(customerId: string) {
  return useQuery<Customer>({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await apiClient.get<Customer>(`/customers/${customerId}`);
      return response;
    },
    enabled: !!customerId,
    staleTime: 60 * 1000,
  });
}