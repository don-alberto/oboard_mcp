import { OboardApiClient } from './client.js';
import { Label, PaginatedResponse } from './types.js';

export interface LabelsQueryParams {
  workspaceId?: number;
  limit?: number;
  offset?: number;
  searchString?: string;
}

export class LabelsApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get all labels with pagination and filtering
   */
  async getLabels(params?: LabelsQueryParams): Promise<PaginatedResponse<Label>> {
    return this.client.get<PaginatedResponse<Label>>('/v2/labels', params);
  }

  /**
   * Get a single label by ID
   */
  async getLabel(id: number): Promise<Label> {
    return this.client.get<Label>(`/v2/labels/${id}`);
  }
} 