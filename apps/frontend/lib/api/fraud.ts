import { apiClient } from './client';
import { Alert, AlertQuery, TriageResult, RiskSignals } from '../types/fraud';

export const fraudApi = {
  async runTriage(customerId: string, transactionId?: string) {
    return apiClient.post<TriageResult>('/fraud/triage', {
      customerId,
      transactionId,
    });
  },

  async getAlerts(query?: AlertQuery) {
    const params = new URLSearchParams();
    if (query?.customerId) params.append('customerId', query.customerId);
    if (query?.type) params.append('type', query.type);
    if (query?.severity) params.append('severity', query.severity);
    if (query?.status) params.append('status', query.status);
    if (query?.startDate) params.append('startDate', query.startDate);
    if (query?.endDate) params.append('endDate', query.endDate);
    if (query?.skip) params.append('skip', query.skip.toString());
    if (query?.take) params.append('take', query.take.toString());

    return apiClient.get<{
      alerts: Alert[];
      pagination: {
        total: number;
        skip: number;
        take: number;
      };
    }>(`/fraud/alerts?${params.toString()}`);
  },

  async getAlert(id: string) {
    return apiClient.get<Alert>(`/fraud/alerts/${id}`);
  },

  async updateAlert(id: string, status: string, triageData?: any) {
    return apiClient.put<Alert>(`/fraud/alerts/${id}`, {
      status,
      triageData,
    });
  },

  async getRiskSignals(customerId: string) {
    return apiClient.get<RiskSignals>(`/fraud/risk-signals/${customerId}`);
  },

  async getFraudQueue(status?: string) {
    const params = status ? `?status=${status}` : '';
    return apiClient.get<{
      queue: Alert[];
      stats: Record<string, number>;
    }>(`/fraud/queue${params}`);
  },

  async freezeCard(cardId: string) {
    return apiClient.post<{
      success: boolean;
      card: any;
      message: string;
    }>(`/fraud/actions/freeze-card/${cardId}`);
  },

  async createDispute(transactionId: string, reason: string) {
    return apiClient.post(`/fraud/actions/dispute/${transactionId}`, {
      reason,
    });
  },

  streamTriage(sessionId: string): EventSource {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/fraud/triage/${sessionId}/stream`;
    return new EventSource(url);
  },
};