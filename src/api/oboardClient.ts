import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define interfaces for the OboardClient
export interface OboardApiOptions {
  baseUrl?: string;
  apiKey?: string;
  workspaceId?: string;
  timeout?: number;
}

export interface OKR {
  id: string;
  title: string;
  description: string;
  status: string;
  cycle: string;
  team: string;
  keyResults: KeyResult[];
}

export interface KeyResult {
  id: string;
  title: string;
  progress: number;
}

export class OboardClient {
  private readonly client;
  private readonly apiKey;
  private readonly workspaceId;

  constructor(options: OboardApiOptions = {}) {
    // Use options if provided, otherwise fall back to environment variables
    const baseUrl = options.baseUrl || process.env.OBOARD_API_BASE_URL || 'https://backend.okr-api.com/api';
    this.apiKey = options.apiKey || process.env.API_KEY || '';
    this.workspaceId = options.workspaceId || process.env.WORKSPACE_ID || '';
    
    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: options.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'API-Token': this.apiKey
      }
    });
  }

  /**
   * Search for OKRs with optional filters
   * @param searchParams Parameters to filter OKRs
   * @returns Promise with array of OKRs
   */
  async searchOKRs(searchParams: { searchString?: string; cycle?: string; team?: string }): Promise<OKR[]> {
    try {
      // Build query parameters for the request
      const params: Record<string, string> = {
        workspaceIds: this.workspaceId,
        typeIds: '1', // Type ID 1 is for OKRs based on the API documentation
        limit: '100', // Ensure we get a good number of results
        searchType: '2' // Required parameter for v2 elements endpoint
      };

      if (searchParams.searchString) {
        params.search = searchParams.searchString;
      }

      if (searchParams.cycle) {
        params.intervalIds = searchParams.cycle;
      }

      if (searchParams.team) {
        params.teamIds = searchParams.team;
      }

      // Make the API request to the v2 endpoint (as per Postman collection)
      const response = await this.client.get('/v2/elements', { params });
      
      // Transform the response to match our expected format
      const okrs = this.transformElementsToOKRs(response.data.data || []);
      return okrs;
    } catch (error: unknown) {
      // Handle and re-throw errors with more context
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        // Format better error messages based on status codes
        switch (statusCode) {
          case 401:
            throw new Error(`Authentication failed: ${errorMessage}. Check your API key.`);
          case 403:
            throw new Error(`Access forbidden: ${errorMessage}. Your API key may not have permission.`);
          case 404:
            throw new Error(`Resource not found: ${errorMessage}`);
          case 429:
            throw new Error(`Rate limit exceeded: ${errorMessage}. Please try again later.`);
          default:
            throw new Error(`API request failed (${statusCode}): ${errorMessage}`);
        }
      }
      
      // For non-Axios errors
      throw new Error(`Failed to search OKRs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transform the API response elements to our OKR interface
   * @param elements Elements from the API response
   * @returns Formatted OKR objects
   */
  private transformElementsToOKRs(elements: any[]): OKR[] {
    return elements.map(element => {
      // Extract the relevant data from the element to match our OKR interface
      const okr: OKR = {
        id: element.id?.toString() || '',
        title: element.name || '',
        description: element.description || '',
        status: this.getStatusFromGrade(element.grade),
        cycle: element.intervalName || '',
        team: (element.teams && element.teams.length > 0) ? element.teams[0].name : '',
        keyResults: this.extractKeyResults(element.children || [])
      };
      
      return okr;
    });
  }

  /**
   * Extract key results from child elements
   */
  private extractKeyResults(keyResults: any[]): KeyResult[] {
    return keyResults
      .filter(kr => kr.typeId === 2) // Filter for key results only (typeId 2)
      .map(kr => ({
        id: kr.id?.toString() || '',
        title: kr.name || '',
        progress: kr.progress || 0
      }));
  }

  /**
   * Convert grade to status text
   */
  private getStatusFromGrade(grade: number): string {
    if (grade >= 70) return 'On Track';
    if (grade >= 40) return 'Behind';
    return 'At Risk';
  }

  /**
   * Get a specific OKR by ID
   * @param id The ID of the OKR to retrieve
   * @returns Promise with the OKR data
   */
  async getOKR(id: string): Promise<OKR> {
    try {
      const params = {
        workspaceIds: this.workspaceId,
        searchType: '2' // Required parameter for v2 elements endpoint
      };
      
      // Get the element from v2 API
      const response = await this.client.get(`/v2/elements/${id}`, { params });
      
      // Extract the element data
      const element = response.data.data;
      
      // Create full OKR object
      const okr: OKR = {
        id: element.id?.toString() || '',
        title: element.name || '',
        description: element.description || '',
        status: this.getStatusFromGrade(element.grade),
        cycle: element.intervalName || '',
        team: (element.teams && element.teams.length > 0) ? element.teams[0].name : '',
        keyResults: this.extractKeyResults(element.children || [])
      };
      
      return okr;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        
        if (statusCode === 404) {
          throw new Error(`OKR with ID '${id}' not found.`);
        }
        
        throw new Error(`Failed to get OKR ${id}: ${errorMessage} (${statusCode})`);
      }
      
      throw new Error(`Failed to get OKR ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available OKR cycles
   * @returns Promise with array of cycle identifiers and names
   */
  async getCycles(): Promise<string[]> {
    try {
      const params = {
        workspaceId: this.workspaceId // Note: singular 'workspaceId' for v1 API
      };
      
      const response = await this.client.get('/v1/intervals', { params });
      
      // Extract cycle names from the v1 API response
      return (response.data.data || []).map((interval: any) => interval.name);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get OKR cycles: ${error.response?.data?.message || error.message}`);
      }
      
      throw new Error(`Failed to get OKR cycles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all available teams
   * @returns Promise with array of team names
   */
  async getTeams(): Promise<string[]> {
    try {
      const params = {
        workspaceId: this.workspaceId // Note: singular 'workspaceId' for v1 API
      };
      
      const response = await this.client.get('/v1/groups', { params });
      
      // Extract team names from the v1 API response
      return (response.data.data || []).map((group: any) => group.name);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get teams: ${error.response?.data?.message || error.message}`);
      }
      
      throw new Error(`Failed to get teams: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 