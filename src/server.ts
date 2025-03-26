// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';
import process from 'node:process';
import { OboardClient, OKRSearchParams } from './oboard/oboardClient.js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Load environment variables
dotenv.config();

// Setup file logger
const LOG_FILE = process.env.LOG_FILE || 'oboard-mcp.log';

/**
 * Log message to file
 * @param level Log level (info, warn, error)
 * @param message Message to log
 */
async function logToFile(level, message) {
  try {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    await fs.appendFile(LOG_FILE, logMessage);
  } catch (error) {
    // Silently handle error - we don't want logging to fail the application
  }
}

/**
 * Format OKRs into a human-readable string
 * @param okrs Array of OKRs to format
 * @returns Formatted string
 */
function formatOKRsForLLM(okrs: any[]): string {
  if (okrs.length === 0) {
    return "No OKRs found matching the specified criteria.";
  }
  
  let result = `Found ${okrs.length} OKRs:\n\n`;
  
  okrs.forEach((okr, index) => {
    result += `## ${okr.displayId ? `[${okr.displayId}] ` : ''}${okr.title}\n`;
    result += `- **Status**: ${okr.status}${okr.grade ? ` (${okr.grade}%)` : ''}\n`;
    result += `- **Team**: ${okr.team}\n`;
    result += `- **Level**: ${okr.level || 'N/A'}\n`;
    result += `- **Cycle**: ${okr.cycle}\n`;
    
    if (okr.description) {
      result += `- **Description**: ${okr.description}\n`;
    }
    
    // Include custom fields if they exist
    if (okr.customFields && Object.keys(okr.customFields).length > 0) {
      result += "- **Custom Fields**:\n";
      for (const [key, value] of Object.entries(okr.customFields)) {
        if (value) {
          result += `  - ${key}: ${value}\n`;
        }
      }
    }
    
    // Include key results if they exist
    if (okr.keyResults && okr.keyResults.length > 0) {
      result += "- **Key Results**:\n";
      okr.keyResults.forEach((kr: any) => {
        result += `  - ${kr.title} (${kr.progress}% complete)\n`;
      });
    }
    
    // Add a separator between OKRs except for the last one
    if (index < okrs.length - 1) {
      result += "\n---\n\n";
    }
  });
  
  return result;
}

/**
 * Main function to run the MCP server
 */
async function main() {
  // Initialize log file with startup message
  await logToFile('info', 'Oboard MCP server starting');
  
  // Initialize the OboardClient
  const client = new OboardClient();
  
  // Check if API key and workspace ID are available
  const apiKeyAvailable = !!process.env.API_KEY;
  const workspaceIdAvailable = !!process.env.WORKSPACE_ID;
  
  let clientInitialized = false;
  
  if (apiKeyAvailable && workspaceIdAvailable) {
    try {
      await client.initialize();
      clientInitialized = true;
      await logToFile('info', 'OboardClient initialized successfully');
    } catch (error) {
      await logToFile('error', `Failed to initialize OboardClient: ${error.message || String(error)}`);
      // Silently handle error
    }
  } else {
    await logToFile('warn', `Missing configuration: API_KEY=${apiKeyAvailable}, WORKSPACE_ID=${workspaceIdAvailable}`);
  }

  // Create the MCP server with logging capability
  const server = new McpServer({
    name: "oboard-mcp",
    version: "0.1.0"
  }, {
    capabilities: {
      logging: {}
    }
  });

  // Add the OKR tool
  server.tool(
    "OKR",
    {
      searchString: z.string().optional().describe("Text to search for in OKR titles or descriptions"),
      startDateFrom: z.string().optional().describe("Filter for OKRs with start date after this date"),
      startDateTo: z.string().optional().describe("Filter for OKRs with start date before this date"),
      dueDateFrom: z.string().optional().describe("Filter for OKRs with due date after this date"),
      dueDateTo: z.string().optional().describe("Filter for OKRs with due date before this date"),
      cycle: z.string().optional().describe("Filter for OKRs in a specific cycle (current, previous, all, or YYYY-Q#)"),
      team: z.string().optional().describe("Filter for OKRs from a specific team (e.g., Posolyt, Marketing)")
    },
    async (params: OKRSearchParams) => {
      // Check if client is initialized
      if (!clientInitialized) {
        await logToFile('error', 'Tool called but OboardClient not initialized');
        return {
          content: [{ 
            type: "text", 
            text: "Connection to Oboard is not possible. Please check if API key and workspace ID are provided in the .env file." 
          }]
        };
      }
      
      try {
        // Log search parameters
        await logToFile('info', `Search params: ${JSON.stringify(params)}`);
        
        // Log the curl equivalent for debugging
        if (params.searchString) {
          const curlEquivalent = `curl --location 'https://backend.okr-api.com/api/v3/elements?workspaceIds=${process.env.WORKSPACE_ID || ''}&searchString=${encodeURIComponent(params.searchString || "")}' --header 'API-Token: ${process.env.API_KEY || ''}'`;
          await logToFile('info', `Curl equivalent: ${curlEquivalent}`);
        }

        // Search for OKRs using the client
        const okrs = await client.searchOKRs({
          searchString: params.searchString,
          startDateFrom: params.startDateFrom,
          startDateTo: params.startDateTo,
          dueDateFrom: params.dueDateFrom,
          dueDateTo: params.dueDateTo,
          cycle: params.cycle,
          team: params.team
        });
        
        // Log the results
        await logToFile('info', `Search results: Found ${okrs.length} OKRs`);
        
        // Format the search results
        const formattedResponse = formatOKRsForLLM(okrs);
        
        return {
          content: [{ type: "text", text: formattedResponse }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Log the error
        await logToFile('error', `Error searching OKRs: ${errorMessage}`);
        
        return {
          content: [{ 
            type: "text", 
            text: `Error searching OKRs: ${errorMessage}` 
          }]
        };
      }
    }
  );

  // Use stdio transport
  const transport = new StdioServerTransport();

  // Log that we're connecting to transport
  await logToFile('info', 'Connecting to transport');

  // Connect the server to the transport
  await server.connect(transport);
  
  await logToFile('info', 'Server connected to transport and ready');
}

// Run the server
main().catch(async (error) => {
  // Log the error
  try {
    await logToFile('error', `Unhandled error in main: ${error.message || String(error)}`);
  } catch {
    // Last resort, we can't even log
  }
  
  // Silently handle error and exit
  process.exit(1);
}); 