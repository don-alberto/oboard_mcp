import { OboardApiClient } from './client.js';
import { PaginatedResponse, Workspace } from './types.js';

export interface WorkspacesQueryParams {
  limit?: number;
  offset?: number;
  searchString?: string;
}

export class WorkspacesApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get all workspaces with pagination and filtering
   */
  async getWorkspaces(params?: WorkspacesQueryParams): Promise<PaginatedResponse<Workspace>> {
    return this.client.get<PaginatedResponse<Workspace>>('/v2/workspaces', params);
  }

  /**
   * Get a single workspace by ID
   */
  async getWorkspace(id: number): Promise<Workspace> {
    return this.client.get<Workspace>(`/v2/workspaces/${id}`);
  }
} 