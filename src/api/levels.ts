import { OboardApiClient } from './client.js';
import { Level, PaginatedResponse } from './types.js';

export interface LevelsQueryParams {
  workspaceId?: number;
  limit?: number;
  offset?: number;
  searchString?: string;
}

export class LevelsApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get all levels with pagination and filtering
   */
  async getLevels(params?: LevelsQueryParams): Promise<PaginatedResponse<Level>> {
    return this.client.get<PaginatedResponse<Level>>('/v2/levels', params);
  }

  /**
   * Get a single level by ID
   */
  async getLevel(id: number): Promise<Level> {
    return this.client.get<Level>(`/v2/levels/${id}`);
  }
} 