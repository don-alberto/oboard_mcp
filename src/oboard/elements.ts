import { OboardApiClient } from './client.js';
import { ApiResponse, Element, ElementSearchType, GradeType, OrderType } from './types.js';

export interface ElementsQueryParams {
  searchType: ElementSearchType;
  workspaceId?: number;
  intervalIds?: number[];
  gradeTypes?: GradeType[];
  groupIds?: number[];
  labelIds?: number[];
  levelIds?: number[];
  typeIds?: number[];
  parentIds?: number[];
  ownerIds?: string[];
  stakeholderIds?: string[];
  watcherIds?: string[];
  searchString?: string;
  startDateFrom?: string;
  startDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  lastGradeUpdateDateFrom?: string;
  lastGradeUpdateDateTo?: string;
  inForeignObjectives?: boolean;
  order?: OrderType[];
  childOrder?: OrderType[];
  offset?: number;
  expandAll?: boolean;
  maxOpenLevel?: number;
  itemsToOpen?: number[];
  limit?: number;
}

export class ElementsApi {
  private client: OboardApiClient;

  constructor(client: OboardApiClient) {
    this.client = client;
  }

  /**
   * Get elements with pagination and filtering options
   */
  async getElements(params: ElementsQueryParams): Promise<ApiResponse<Element>> {
    return this.client.get<ApiResponse<Element>>('/v3/elements', params);
  }

  /**
   * Get a single element by ID
   */
  async getElement(id: number): Promise<Element> {
    return this.client.get<Element>(`/v3/elements/${id}`);
  }

  /**
   * Get nested elements
   */
  async getNestedElements(params: ElementsQueryParams): Promise<ApiResponse<Element>> {
    return this.client.get<ApiResponse<Element>>('/v3/elements/nested', params);
  }
} 