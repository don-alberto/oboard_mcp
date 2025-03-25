import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface OboardApiConfig {
  baseUrl: string;
  token: string;
  defaultWorkspaceId?: number;
}

export class OboardApiClient {
  private client: AxiosInstance;
  private token: string;
  private defaultWorkspaceId?: number;

  constructor(config: OboardApiConfig) {
    this.token = config.token;
    this.defaultWorkspaceId = config.defaultWorkspaceId;
    
    // Use the baseURL as provided - it should already include /api
    let baseURL = config.baseUrl;
    
    // Ensure the baseURL doesn't end with a slash
    if (baseURL.endsWith('/')) {
      baseURL = baseURL.slice(0, -1);
    }
    
    console.log(`Using base URL: ${baseURL}`);
    
    this.client = axios.create({
      baseURL,
      headers: {
        'API-Token': this.token,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Make a GET request to the API
   */
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      // Automatically add workspaceId if available
      const enhancedParams = { ...params };
      if (this.defaultWorkspaceId && !enhancedParams.workspaceId) {
        enhancedParams.workspaceId = this.defaultWorkspaceId;
      }

      // Use the path as provided - do not add /api prefix
      console.log(`Making GET request to: ${path}`);
      const response = await this.client.get<T>(path, { params: enhancedParams });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): void {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;
      
      // Log the request URL that caused the error
      console.error(`Error with request URL: ${error.config?.baseURL}${error.config?.url}`);

      // Handle specific error cases
      if (status === 401) {
        console.error('Authentication error: Invalid or expired token');
      } else if (status === 429) {
        console.error('Rate limit exceeded: The rate limit is 5 requests per sec per organisation');
      }

      console.error(`API Error (${status}):`, data);
    } else {
      console.error('Unexpected error:', error);
    }
  }
} 