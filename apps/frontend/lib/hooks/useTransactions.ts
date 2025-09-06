import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '../api/transactions';
import { TransactionQuery } from '../types/transaction';
import { toast } from 'sonner';

export function useTransactions(query?: TransactionQuery) {
  return useQuery({
    queryKey: ['transactions', query],
    queryFn: () => transactionsApi.getTransactions(query),
    staleTime: 2 * 60 * 1000, // 2 minutes (was 30 seconds)
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionsApi.getTransaction(id),
    enabled: !!id,
  });
}

export function useCustomerTransactions(customerId: string, query?: TransactionQuery) {
  return useQuery({
    queryKey: ['customer-transactions', customerId, query],
    queryFn: () => transactionsApi.getCustomerTransactions(customerId, query),
    enabled: !!customerId,
  });
}

export function useTransactionStats(query?: TransactionQuery) {
  return useQuery({
    queryKey: ['transaction-stats', query],
    queryFn: () => transactionsApi.getTransactionStats(query),
    staleTime: 5 * 60 * 1000, // 5 minutes (was 1 minute)
  });
}

export function useAnomalyDetection(query?: TransactionQuery) {
  return useQuery({
    queryKey: ['anomalies', query],
    queryFn: () => transactionsApi.detectAnomalies(query),
    staleTime: 3 * 60 * 1000, // 3 minutes (was 30 seconds)
  });
}

export function useUploadTransactions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (transactions: any[]) => transactionsApi.uploadTransactions(transactions),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`Successfully uploaded ${data.uploaded} transactions`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload transactions');
    },
  });
}