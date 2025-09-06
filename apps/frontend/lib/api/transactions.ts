import { apiClient } from './client';
import { Transaction, TransactionStats, TransactionQuery } from '../types/transaction';

export const transactionsApi = {
  async getTransactions(query?: TransactionQuery) {
    const params = new URLSearchParams();
    if (query?.customerId) params.append('customerId', query.customerId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.mcc) params.append('mcc', query.mcc);
    if (query?.merchant) params.append('merchant', query.merchant);
    if (query?.status) params.append('status', query.status);
    if (query?.minAmount) params.append('minAmount', query.minAmount.toString());
    if (query?.maxAmount) params.append('maxAmount', query.maxAmount.toString());
    if (query?.skip) params.append('skip', query.skip.toString());
    if (query?.take) params.append('take', query.take.toString());

    return apiClient.get<{
      transactions: Transaction[];
      pagination: {
        total: number;
        skip: number;
        take: number;
      };
    }>(`/transactions?${params.toString()}`);
  },

  async getTransaction(id: string) {
    return apiClient.get<Transaction>(`/transactions/${id}`);
  },

  async getCustomerTransactions(customerId: string, query?: TransactionQuery) {
    const params = new URLSearchParams();
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.skip) params.append('skip', query.skip.toString());
    if (query?.take) params.append('take', query.take.toString());

    return apiClient.get<{
      transactions: Transaction[];
      pagination: {
        total: number;
        skip: number;
        take: number;
      };
    }>(`/transactions/customer/${customerId}?${params.toString()}`);
  },

  async uploadTransactions(transactions: any[]) {
    return apiClient.post('/transactions/upload', { transactions });
  },

  async getTransactionStats(query?: TransactionQuery) {
    const params = new URLSearchParams();
    if (query?.customerId) params.append('customerId', query.customerId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    return apiClient.get<TransactionStats>(`/transactions/stats/summary?${params.toString()}`);
  },

  async detectAnomalies(query?: TransactionQuery) {
    const params = new URLSearchParams();
    if (query?.customerId) params.append('customerId', query.customerId);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);

    return apiClient.get<{
      anomalies: Array<{
        transaction: Transaction;
        score: number;
        reasons: string[];
      }>;
    }>(`/transactions/anomalies/detect?${params.toString()}`);
  },
};