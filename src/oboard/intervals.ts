import { OboardApiClient } from './client.js';
import { Interval, PaginatedResponse } from './types.js';

export interface IntervalsQueryParams {
  workspaceId?: number;
  limit?: number;
  offset?: number;
  searchString?: string;
}

export class IntervalsApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get all intervals with pagination and filtering
   */
  async getIntervals(params?: IntervalsQueryParams): Promise<PaginatedResponse<Interval>> {
    return this.client.get<PaginatedResponse<Interval>>('/v1/intervals', params);
  }

  /**
   * Get a single interval by ID
   */
  async getInterval(id: number): Promise<Interval> {
    return this.client.get<Interval>(`/v1/intervals/${id}`);
  }
} 