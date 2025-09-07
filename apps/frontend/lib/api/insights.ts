import { apiClient } from './client';
import { SpendInsights, Report } from '../types/insights';

export const insightsApi = {
  async getSpendInsights(customerId: string, period?: string) {
    const params = period ? `?period=${period}` : '';
    return apiClient.get<any>(`/insights/spend/${customerId}${params}`);
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
    return apiClient.post<{
      id: string;
      customerId: string;
      type: string;
      status: string;
      content?: any;
      generatedAt: string;
      expiresAt: string;
    }>('/insights/reports/generate', {
      customerId,
      type
    });
  },

  async getReports(customerId?: string) {
    const params = customerId ? `?customerId=${customerId}` : '';
    return apiClient.get<Array<{
      id: string;
      customerId: string;
      type: string;
      status: string;
      content?: any;
      generatedAt: string;
      expiresAt: string;
    }>>(`/insights/reports${params}`);
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