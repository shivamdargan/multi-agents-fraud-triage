import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { toast } from 'sonner';

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  details?: any;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Track ongoing requests to prevent duplicates
    const pendingRequests = new Map();
    
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Create a request key including body for POST/PUT/PATCH
        const bodyKey = (config.method?.toUpperCase() === 'POST' || 
                        config.method?.toUpperCase() === 'PUT' || 
                        config.method?.toUpperCase() === 'PATCH') 
                        ? JSON.stringify(config.data) : '';
        const requestKey = `${config.method}:${config.url}:${JSON.stringify(config.params)}:${bodyKey}`;
        
        // Check if this request is already pending
        if (pendingRequests.has(requestKey)) {
          console.log('Duplicate request blocked:', requestKey);
          return Promise.reject(new Error('Duplicate request'));
        }
        
        // Mark request as pending
        pendingRequests.set(requestKey, true);
        
        // Clean up after request completes
        if (!config.metadata) {
          config.metadata = {};
        }
        config.metadata.requestKey = requestKey;
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        // Clear pending request
        const requestKey = response.config?.metadata?.requestKey;
        if (requestKey) {
          pendingRequests.delete(requestKey);
        }
        // If the response has a 'data' property, use it (even if null)
        // Otherwise fall back to response.data
        return response.data?.hasOwnProperty('data') ? response.data.data : response.data;
      },
      (error: AxiosError<ApiError>) => {
        // Clear pending request on error
        const requestKey = error.config?.metadata?.requestKey;
        if (requestKey) {
          pendingRequests.delete(requestKey);
        }
        
        // Don't treat as error if it's a duplicate request rejection
        if (error.message === 'Duplicate request') {
          return Promise.reject(error);
        }
        
        const message = error.response?.data?.message || 'An error occurred';
        const statusCode = error.response?.status || 500;

        if (statusCode === 401) {
          this.clearToken();
          window.location.href = '/login';
        }

        if (statusCode >= 500) {
          console.error('Server error:', { statusCode, message, url: error.config?.url });
          // Don't show toast here - let the specific error handlers in hooks handle it
        }

        return Promise.reject({
          message,
          statusCode,
          error: error.response?.data?.error,
          details: error.response?.data?.details,
        });
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  public setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.get<T>(url, config) as any;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.post<T>(url, data, config) as any;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.put<T>(url, data, config) as any;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.client.delete<T>(url, config) as any;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.client.patch<T>(url, data, config) as any;
  }
}

export const apiClient = new ApiClient();