import apiClient from '../api-client';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  lastActivity?: string;
  totalTransactions: number;
  totalSpent: number;
  cards?: Card[];
  transactions?: Transaction[];
}

export interface Card {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  status: 'ACTIVE' | 'FROZEN' | 'EXPIRED';
}

export interface Transaction {
  id: string;
  customerId: string;
  cardId?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  type: 'PURCHASE' | 'WITHDRAWAL' | 'TRANSFER' | 'REFUND';
  merchantName?: string;
  merchantCategory?: string;
  location?: string;
  timestamp: string;
  riskScore?: number;
  flagged?: boolean;
}

export const customersApi = {
  getAll: async (params?: {
    search?: string;
    riskLevel?: string;
    limit?: number;
    offset?: number;
  }): Promise<Customer[]> => {
    const { data } = await apiClient.get('/customers', { params });
    return data;
  },

  getById: async (id: string): Promise<Customer> => {
    const { data } = await apiClient.get(`/customers/${id}`);
    return data;
  },

  getTransactions: async (customerId: string, params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Transaction[]> => {
    const { data } = await apiClient.get(`/customers/${customerId}/transactions`, { params });
    return data;
  },

  getInsights: async (customerId: string) => {
    const { data } = await apiClient.get(`/customers/${customerId}/insights`);
    return data;
  },

  updateRiskLevel: async (customerId: string, riskLevel: string) => {
    const { data } = await apiClient.patch(`/customers/${customerId}/risk-level`, { riskLevel });
    return data;
  }
};