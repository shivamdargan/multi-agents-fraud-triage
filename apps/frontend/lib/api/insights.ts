import { apiClient } from './client';
import { SpendInsights, Report } from '../types/insights';

export const insightsApi = {
  async getSpendInsights(customerId: string, period?: string) {
    // Use the customers insights endpoint
    return apiClient.get<any>(`/customers/${customerId}/insights`);
  },

  async getCategoryBreakdown(customerId: string) {
    return apiClient.get<{
      categories: Array<{
        mcc: string;
        category: string;
        total: number;
        count: number;
        percentage: number;
      }>;
    }>(`/insights/categories/${customerId}`);
  },

  async getTopMerchants(customerId: string, limit: number = 10) {
    return apiClient.get<{
      merchants: Array<{
        merchant: string;
        total: number;
        count: number;
        lastTransaction: string;
      }>;
    }>(`/insights/merchants/${customerId}?limit=${limit}`);
  },

  async generateReport(customerId: string, type: string) {
    // Return a mock response for now since endpoint doesn't exist
    return Promise.resolve({
      id: 'mock-' + Date.now(),
      type,
      status: 'PENDING',
      generatedAt: new Date().toISOString(),
    });
  },

  async getReports(customerId?: string) {
    // Return empty array for now since endpoint doesn't exist
    return Promise.resolve([]);
  },

  async getTimeSeriesData(customerId: string, metric: string, period: string) {
    return apiClient.get<{
      data: Array<{
        date: string;
        value: number;
      }>;
    }>(`/insights/time-series/${customerId}?metric=${metric}&period=${period}`);
  },
};