import { OboardApiClient } from './client.js';
import { PaginatedResponse, UserResponse } from './types.js';

export interface UsersQueryParams {
  limit?: number;
  offset?: number;
  searchString?: string;
  includeInactive?: boolean;
  workspaceId?: number;
}

export class UsersApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(params?: UsersQueryParams): Promise<PaginatedResponse<UserResponse>> {
    return this.client.get<PaginatedResponse<UserResponse>>('/v1/users', params);
  }

  /**
   * Get a single user by ID
   */
  async getUser(id: string): Promise<UserResponse> {
    return this.client.get<UserResponse>(`/v1/users/${id}`);
  }
} 