import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fraudApi } from '../api/fraud';
import { AlertQuery, TriageProgress } from '../types/fraud';
import { toast } from 'sonner';

export function useAlerts(query?: AlertQuery) {
  return useQuery({
    queryKey: ['alerts', query],
    queryFn: () => fraudApi.getAlerts(query),
    staleTime: 30000,
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: ['alert', id],
    queryFn: () => fraudApi.getAlert(id),
    enabled: !!id,
  });
}

export function useRiskSignals(customerId: string) {
  return useQuery({
    queryKey: ['risk-signals', customerId],
    queryFn: () => fraudApi.getRiskSignals(customerId),
    enabled: !!customerId,
    staleTime: 60000,
  });
}

export function useFraudQueue(status?: string) {
  return useQuery({
    queryKey: ['fraud-queue', status],
    queryFn: () => fraudApi.getFraudQueue(status),
    // refetchInterval: 60000, // DISABLED - no automatic refetching
  });
}

export function useTriage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerId, transactionId }: { customerId: string; transactionId?: string }) => 
      fraudApi.runTriage(customerId, transactionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk-signals'] });
      toast.success('Triage completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Triage failed');
    },
  });
}

export function useTriageStream(sessionId: string | null) {
  const [progress, setProgress] = useState<TriageProgress[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const eventSource = fraudApi.streamTriage(sessionId);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(prev => [...prev, data]);
      
      if (data.type === 'complete' || data.type === 'error') {
        setIsComplete(true);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setIsComplete(true);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  return { progress, isComplete };
}

export function useFreezeCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ cardId, otp }: { cardId: string; otp?: string }) => 
      fraudApi.freezeCard(cardId, otp),
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries that might contain card data
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card', variables.cardId] });
      queryClient.invalidateQueries({ queryKey: ['customer'] }); // This will refetch customer data with cards
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      if (data.status === 'FROZEN') {
        toast.success(data.message || 'Card frozen successfully');
      }
    },
    onError: (error: any) => {
      if (error.statusCode !== 429) { // Don't show error toast for rate limiting
        toast.error(error.message || 'Failed to freeze card');
      }
    },
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ transactionId, reason, reasonCode }: { 
      transactionId: string; 
      reason: string;
      reasonCode?: string;
    }) => fraudApi.createDispute(transactionId, reason, reasonCode),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      queryClient.invalidateQueries({ queryKey: ['dispute', variables.transactionId] });
      queryClient.invalidateQueries({ queryKey: ['customer-disputes'] });
      // Success toast is handled in the component to show case ID
    },
    onError: (error: any) => {
      if (error.statusCode !== 429) { // Don't show error toast for rate limiting
        toast.error(error.message || 'Failed to create dispute');
      }
    },
  });
}

export function useDisputeByTransaction(transactionId: string) {
  return useQuery({
    queryKey: ['dispute', transactionId],
    queryFn: () => fraudApi.getDisputeByTransaction(transactionId),
    enabled: !!transactionId,
  });
}

export function useCustomerDisputes(customerId: string) {
  return useQuery({
    queryKey: ['customer-disputes', customerId],
    queryFn: () => fraudApi.getCustomerDisputes(customerId),
    enabled: !!customerId,
  });
}

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: () => fraudApi.getCard(cardId),
    enabled: !!cardId,
  });
}

export function useUnfreezeCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, otp }: { cardId: string; otp?: string }) =>
      fraudApi.unfreezeCard(cardId, otp),
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries that might contain card data
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card', variables.cardId] });
      queryClient.invalidateQueries({ queryKey: ['customer'] }); // This will refetch customer data with cards
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      
      if (data.status === 'ACTIVE') {
        toast.success(data.message || 'Card unfrozen successfully');
      }
    },
    onError: (error: any) => {
      if (error.statusCode !== 429) {
        toast.error(error.message || 'Failed to unfreeze card');
      }
    },
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, triageData }: { id: string; status: string; triageData?: any }) => 
      fraudApi.updateAlert(id, status, triageData),
    onSuccess: async (data, variables) => {
      // Invalidate and refetch immediately
      await queryClient.invalidateQueries({ queryKey: ['alert', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['fraud-queue'] });
      // Success toast handled in component
    },
    onError: (error: any) => {
      console.error('Failed to update alert:', error);
      // Only show toast if it's not a duplicate request error and not a server error (already shown by interceptor)
      if (error.message !== 'Duplicate request' && error.statusCode < 500) {
        toast.error(error.message || 'Failed to update alert');
      }
    },
  });
}