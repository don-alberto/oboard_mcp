import { OboardApiClient, OboardApiConfig } from './client.js';
import { ElementsApi } from './elements.js';
import { WorkspacesApi } from './workspaces.js';
import { UsersApi } from './users.js';
import { GroupsApi } from './groups.js';
import { IntervalsApi } from './intervals.js';
import { LabelsApi } from './labels.js';
import { LevelsApi } from './levels.js';

/**
 * Main Oboard API client that provides access to all API endpoints
 */
export class OboardApi {
  private client: OboardApiClient;
  elements: ElementsApi;
  workspaces: WorkspacesApi;
  users: UsersApi;
  groups: GroupsApi;
  intervals: IntervalsApi;
  labels: LabelsApi;
  levels: LevelsApi;

  /**
   * Create a new Oboard API client
   * 
   * @param config Configuration object with baseUrl and token
   */
  constructor(config: OboardApiConfig) {
    // If WORKSPACE_ID is available in the environment, use it as default
    const defaultWorkspaceId = process.env.WORKSPACE_ID ? 
      parseInt(process.env.WORKSPACE_ID, 10) : undefined;
    
    this.client = new OboardApiClient({
      ...config,
      defaultWorkspaceId
    });
    
    // Initialize all API modules
    this.elements = new ElementsApi(this.client);
    this.workspaces = new WorkspacesApi(this.client);
    this.users = new UsersApi(this.client);
    this.groups = new GroupsApi(this.client);
    this.intervals = new IntervalsApi(this.client);
    this.labels = new LabelsApi(this.client);
    this.levels = new LevelsApi(this.client);
  }
}

// Re-export types
export * from './types.js';
export * from './client.js';
export * from './elements.js';
export * from './workspaces.js';
export * from './users.js';
export * from './groups.js';
export * from './intervals.js';
export * from './labels.js';
export * from './levels.js'; 