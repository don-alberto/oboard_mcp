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

export interface OKRSearchParams {
  searchString?: string;
  startDateFrom?: string;
  startDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  cycle?: string;
  team?: string;
}

export interface OKR {
  id: string;
  displayId?: string;
  title: string;
  description: string;
  status: string;
  cycle: string;
  team: string;
  level?: string;
  customFields?: Record<string, any>;
  grade?: number;
  keyResults: KeyResult[];
}

export interface KeyResult {
  id: string;
  title: string;
  progress: number;
}

export interface CycleInfo {
  id: string;
  name: string;
}

export interface TeamInfo {
  id: string;
  name: string;
}

export class OboardClient {
  private readonly client;
  private readonly apiKey;
  private readonly workspaceId;
  private cyclesCache: CycleInfo[] = [];
  private teamsCache: TeamInfo[] = [];
  private cacheExpiry = 0;
  private readonly cacheTTL: number;

  constructor(options: OboardApiOptions = {}) {
    // Use options if provided, otherwise fall back to environment variables
    const baseUrl = options.baseUrl || process.env.OBOARD_API_BASE_URL || 'https://backend.okr-api.com/api';
    this.apiKey = options.apiKey || process.env.API_KEY || '';
    this.workspaceId = options.workspaceId || process.env.WORKSPACE_ID || '';
    this.cacheTTL = parseInt(process.env.CACHE_TTL || '3600', 10) * 1000; // Convert to milliseconds
    
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
   * Initialize the client by loading teams and cycles data
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    if (!this.apiKey || !this.workspaceId) {
      throw new Error('API key or workspace ID not provided. Please check your .env file.');
    }
    
    try {
      await this.loadCyclesAndTeams();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Load cycles and teams data and cache them
   */
  private async loadCyclesAndTeams(): Promise<void> {
    const now = Date.now();
    
    // Skip if cache is still valid
    if (this.cyclesCache.length > 0 && this.teamsCache.length > 0 && now < this.cacheExpiry) {
      return;
    }
    
    try {
      // Load cycles (intervals)
      const cyclesResponse = await this.client.get('/v1/intervals', {
        params: { workspaceId: this.workspaceId }
      });
      
      this.cyclesCache = (cyclesResponse.data.data || []).map((interval: any) => ({
        id: interval.id.toString(),
        name: interval.name
      }));
      
      // Load teams (groups)
      const teamsResponse = await this.client.get('/v1/groups', {
        params: { workspaceId: this.workspaceId }
      });
      
      this.teamsCache = (teamsResponse.data.data || []).map((group: any) => ({
        id: group.id.toString(),
        name: group.name
      }));
      
      // Set cache expiry
      this.cacheExpiry = now + this.cacheTTL;
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Convert date string to ISO format
   * @param dateStr Date string to convert
   * @returns Formatted date string or undefined if invalid
   */
  private formatDateString(dateStr?: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      // Check if valid date
      if (isNaN(date.getTime())) {
        return undefined;
      }
      return date.toISOString(); // Format: 2023-08-04T09:10:40.326Z
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Resolve cycle string to interval ID
   * @param cycle Cycle string (current, previous, all, or specific cycle name)
   * @returns Interval ID or undefined
   */
  private resolveCycleToIntervalId(cycle?: string): string | undefined {
    if (!cycle) return undefined;
    
    // Ensure cache is loaded
    if (this.cyclesCache.length === 0) {
      return undefined;
    }
    
    // Sort cycles by date (assuming format YYYY-Q#)
    const sortedCycles = [...this.cyclesCache].sort((a, b) => {
      const aYear = parseInt(a.name.split('-')[0] || '0', 10);
      const bYear = parseInt(b.name.split('-')[0] || '0', 10);
      
      if (aYear !== bYear) return bYear - aYear;
      
      const aQuarter = parseInt(a.name.split('Q')[1] || '0', 10);
      const bQuarter = parseInt(b.name.split('Q')[1] || '0', 10);
      
      return bQuarter - aQuarter;
    });
    
    if (cycle.toLowerCase() === 'current' && sortedCycles.length > 0) {
      return sortedCycles[0].id;
    }
    
    if (cycle.toLowerCase() === 'previous' && sortedCycles.length > 1) {
      return sortedCycles[1].id;
    }
    
    if (cycle.toLowerCase() === 'all') {
      return undefined; // Don't filter by cycle
    }
    
    // Look for exact match
    const matchedCycle = this.cyclesCache.find(c => 
      c.name.toLowerCase() === cycle.toLowerCase()
    );
    
    return matchedCycle?.id;
  }

  /**
   * Resolve team name to team ID
   * @param teamName Team name to resolve
   * @returns Team ID or undefined
   */
  private resolveTeamToId(teamName?: string): string | undefined {
    if (!teamName) return undefined;
    
    // Ensure cache is loaded
    if (this.teamsCache.length === 0) {
      return undefined;
    }
    
    const matchedTeam = this.teamsCache.find(t => 
      t.name.toLowerCase() === teamName.toLowerCase()
    );
    
    return matchedTeam?.id;
  }

  /**
   * Search for OKRs with optional filters
   * @param searchParams Parameters to filter OKRs
   * @returns Promise with array of OKRs
   */
  async searchOKRs(searchParams: OKRSearchParams): Promise<OKR[]> {
    try {
      // Ensure cache is loaded
      await this.loadCyclesAndTeams();
      
      // For search string requests, do a direct URL approach matching the curl example
      if (searchParams.searchString) {
        // Create a URL that exactly matches the curl format
        const url = `/v3/elements?workspaceIds=${this.workspaceId}&searchString=${encodeURIComponent(searchParams.searchString)}`;
        
        // Make the direct request
        const response = await this.client.get(url);
        
        // Debug log the raw response structure
        await this.logDebugInfo('API Response raw format', {
          dataType: typeof response.data,
          hasDataProperty: 'data' in response.data,
          responseShape: JSON.stringify(response.data).substring(0, 500) + '...',
        });
        
        // If the response is an array directly, use it
        let elements;
        if (Array.isArray(response.data)) {
          elements = response.data;
          await this.logDebugInfo('Response is array', {
            length: elements.length,
            firstElement: elements.length > 0 ? JSON.stringify(elements[0]).substring(0, 200) : 'none',
          });
        } else if (response.data && typeof response.data === 'object') {
          // If it has a data property that is an array, use that
          if ('data' in response.data && Array.isArray(response.data.data)) {
            elements = response.data.data;
            await this.logDebugInfo('Response has data array', {
              length: elements.length,
              firstElement: elements.length > 0 ? JSON.stringify(elements[0]).substring(0, 200) : 'none',
            });
          } else {
            // No array found, log error and return empty
            await this.logDebugInfo('Response has unexpected structure', {
              keys: Object.keys(response.data),
            });
            elements = [];
          }
        } else {
          // Fallback - assume empty
          elements = [];
          await this.logDebugInfo('Response has unexpected type', {
            type: typeof response.data,
          });
        }
        
        // Transform the response to match our expected format
        let okrs = this.transformElementsToOKRs(elements || []);
        
        // Log after transformation
        await this.logDebugInfo('After transformation', {
          okrCount: okrs.length,
          firstOkr: okrs.length > 0 ? JSON.stringify(okrs[0]).substring(0, 200) : 'none',
        });
        
        // Apply in-memory team filtering if needed
        if (searchParams.team) {
          okrs = this.filterByTeam(okrs, searchParams.team);
        }
        
        return okrs;
      }
      
      // For other types of searches, use the params approach
      // Build query parameters for the request
      const params: Record<string, string> = {
        workspaceIds: this.workspaceId
      };

      // Process date parameters
      const startDateFrom = this.formatDateString(searchParams.startDateFrom);
      if (startDateFrom) {
        params.startDateFrom = startDateFrom;
      }
      
      const startDateTo = this.formatDateString(searchParams.startDateTo);
      if (startDateTo) {
        params.startDateTo = startDateTo;
      }
      
      const dueDateFrom = this.formatDateString(searchParams.dueDateFrom);
      if (dueDateFrom) {
        params.dueDateFrom = dueDateFrom;
      }
      
      const dueDateTo = this.formatDateString(searchParams.dueDateTo);
      if (dueDateTo) {
        params.dueDateTo = dueDateTo;
      }

      // Process cycle parameter
      const intervalId = this.resolveCycleToIntervalId(searchParams.cycle);
      if (intervalId) {
        params.intervalIds = intervalId;
      }

      // Make the API request to the v3 endpoint
      const response = await this.client.get('/v3/elements', { params });
      
      // Transform the response to match our expected format
      let okrs = this.transformElementsToOKRs(response.data.data || []);
      
      // Apply in-memory team filtering if needed
      if (searchParams.team) {
        okrs = this.filterByTeam(okrs, searchParams.team);
      }
      
      return okrs;
    } catch (error: unknown) {
      // Handle and re-throw errors with more context
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;
        const requestUrl = error.config?.url;
        
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
            throw new Error(`API request failed (${statusCode}): ${errorMessage}, URL: ${requestUrl}`);
        }
      }
      
      // For non-Axios errors
      throw new Error(`Failed to search OKRs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Filter OKRs by team name in memory
   * @param okrs Array of OKRs to filter
   * @param teamName Team name to filter by
   * @returns Filtered array of OKRs
   */
  private filterByTeam(okrs: OKR[], teamName: string): OKR[] {
    if (!teamName) return okrs;
    
    const teamId = this.resolveTeamToId(teamName);
    
    if (teamName && !teamId) {
      // No matching team ID found, return empty result
      return [];
    }
    
    // Filter by team name (case insensitive match)
    return okrs.filter(okr => 
      okr.team.toLowerCase() === teamName.toLowerCase()
    );
  }

  /**
   * Transform the API response elements to our OKR interface
   * @param elements Elements from the API response
   * @returns Formatted OKR objects
   */
  private transformElementsToOKRs(elements: any[]): OKR[] {
    if (!elements || elements.length === 0) {
      return [];
    }
    
    // Filter to only include OKR types (not Key Results, which have typeId 4)
    // For direct API response, we need to check for typeId to determine what's what
    const okrs = elements.filter(element => element.typeId === 1);
    const keyResults = elements.filter(element => element.typeId === 4);
    
    // If we have key results but no OKRs, it means we got direct key results from search
    // We need to treat them as top-level items
    if (okrs.length === 0 && keyResults.length > 0) {
      return keyResults.map(kr => {
        // Extract the team name from groups field
        const teamName = kr.groups && kr.groups.length > 0 ? kr.groups[0].name : '';
        
        // Build OKR object for a key result
        return {
          id: kr.id?.toString() || '',
          displayId: kr.displayId || '',
          title: kr.name || '',
          description: kr.description || '',
          status: this.getStatusFromGrade(kr.currentValue || 0),
          cycle: kr.intervalName || '',
          team: teamName,
          level: '',
          grade: kr.currentValue,
          customFields: {},
          keyResults: [] // No nested key results for a key result
        };
      });
    }
    
    // Standard OKR processing
    return elements.map(element => {
      // Extract the team name from groups field
      const teamName = element.groups && element.groups.length > 0 
        ? element.groups[0].name 
        : (element.teams && element.teams.length > 0 ? element.teams[0].name : '');
      
      // Extract the relevant data from the element to match our OKR interface
      const okr: OKR = {
        id: element.id?.toString() || '',
        displayId: element.displayId || '',
        title: element.name || '',
        description: element.description || '',
        status: this.getStatusFromGrade(element.grade || element.currentValue || 0),
        cycle: element.intervalName || '',
        team: teamName,
        level: element.levelName || '',
        grade: element.grade || element.currentValue,
        customFields: element.customFields || {},
        keyResults: this.extractKeyResults(element.childElements || element.children || [])
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
        workspaceIds: this.workspaceId
      };
      
      // Get the element from v3 API
      const response = await this.client.get(`/v3/elements/${id}`, { params });
      
      // Extract the element data
      const element = response.data.data;
      
      // Create full OKR object
      const okr: OKR = {
        id: element.id?.toString() || '',
        displayId: element.displayId || '',
        title: element.name || '',
        description: element.description || '',
        status: this.getStatusFromGrade(element.grade),
        cycle: element.intervalName || '',
        team: (element.teams && element.teams.length > 0) ? element.teams[0].name : '',
        level: element.levelName || '',
        grade: element.grade,
        customFields: element.customFields || {},
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
  async getCycles(): Promise<CycleInfo[]> {
    try {
      await this.loadCyclesAndTeams();
      return this.cyclesCache;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get OKR cycles: ${error.response?.data?.message || error.message}`);
      }
      
      throw new Error(`Failed to get OKR cycles: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all available teams
   * @returns Promise with array of team information
   */
  async getTeams(): Promise<TeamInfo[]> {
    try {
      await this.loadCyclesAndTeams();
      return this.teamsCache;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get teams: ${error.response?.data?.message || error.message}`);
      }
      
      throw new Error(`Failed to get teams: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Log debug information to file
   * @param context Context description
   * @param data Data to log
   */
  private async logDebugInfo(context: string, data: any): Promise<void> {
    try {
      // Only attempt to log if we're in Node.js environment with fs access
      if (typeof process !== 'undefined' && process.env) {
        const fs = await import('node:fs/promises');
        const LOG_FILE = process.env.LOG_FILE || 'oboard-mcp.log';
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [DEBUG] ${context}: ${JSON.stringify(data)}\n`;
        await fs.appendFile(LOG_FILE, logMessage);
      }
    } catch (error) {
      // Silently handle errors - we don't want logging to fail the application
    }
  }
}