import { OboardApiClient } from './client.js';
import { Group, PaginatedResponse } from './types.js';

export interface GroupsQueryParams {
  workspaceId?: number;
  limit?: number;
  offset?: number;
  searchString?: string;
}

export class GroupsApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get all groups with pagination and filtering
   */
  async getGroups(params?: GroupsQueryParams): Promise<PaginatedResponse<Group>> {
    return this.client.get<PaginatedResponse<Group>>('/v2/groups', params);
  }

  /**
   * Get a single group by ID
   */
  async getGroup(id: number): Promise<Group> {
    return this.client.get<Group>(`/v2/groups/${id}`);
  }
} 