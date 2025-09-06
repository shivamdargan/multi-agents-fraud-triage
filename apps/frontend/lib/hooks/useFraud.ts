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
    mutationFn: (cardId: string) => fraudApi.freezeCard(cardId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast.success(data.message);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to freeze card');
    },
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) => 
      fraudApi.createDispute(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      toast.success('Dispute created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create dispute');
    },
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status, triageData }: { id: string; status: string; triageData?: any }) => 
      fraudApi.updateAlert(id, status, triageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update alert');
    },
  });
}