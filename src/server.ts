// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';
import process from 'node:process';
import { OboardClient, OKRSearchParams } from './oboard/oboardClient.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// Load environment variables first, before any other initialization
dotenv.config();

// Immediate startup logging - even before any initialization
(async function immediateStartupLog() {
  try {
    const startupFile = path.join(os.homedir(), 'oboard-startup.log');
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] Oboard MCP server initial startup attempt\n`;
    await fs.appendFile(startupFile, message);
    
    // Log essential information
    const basicInfo = {
      pid: process.pid,
      cwd: process.cwd(),
      argv: process.argv,
      execPath: process.execPath,
      logFile: process.env.LOG_FILE || '(not set)',
      env: {
        NODE_ENV: process.env.NODE_ENV,
        PATH: 'REDACTED',
        HOME: process.env.HOME,
        USER: process.env.USER
      }
    };
    await fs.appendFile(startupFile, `[${timestamp}] Basic info: ${JSON.stringify(basicInfo)}\n`);
  } catch (err) {
    // Last resort - try sync write
    try {
      const fsSync = require('fs');
      fsSync.appendFileSync(path.join(os.homedir(), 'oboard-startup.log'), 
        `[${new Date().toISOString()}] Failed to log startup: ${err.message}\n`);
    } catch (e) {
      // Nothing more we can do
    }
  }
})();

// Default LOG_FILE to home directory if not set in .env
const LOG_FILE = process.env.LOG_FILE || path.join(os.homedir(), 'oboard-mcp.log');

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
 * Log extended environment information
 */
async function logEnvironmentInfo() {
  try {
    const env = {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid,
      ppid: process.ppid,
      cwd: process.cwd(),
      argv: process.argv,
      hostname: os.hostname(),
      commandLineArgs: JSON.stringify(process.argv.slice(2))
    };
    
    await logToFile('info', `Environment: ${JSON.stringify(env)}`);
    
    // Log important environment variables (without sensitive data)
    const safeEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      WORKSPACE_ID: process.env.WORKSPACE_ID ? 'SET' : 'NOT SET',
      API_KEY: process.env.API_KEY ? 'SET' : 'NOT SET',
      OBOARD_API_BASE_URL: process.env.OBOARD_API_BASE_URL,
      LOG_FILE: process.env.LOG_FILE,
      CACHE_TTL: process.env.CACHE_TTL,
      PATH: process.env.PATH ? 'SET (omitted for brevity)' : 'NOT SET'
    };
    
    await logToFile('info', `Environment variables: ${JSON.stringify(safeEnvVars)}`);
    
    // Check for stdio access
    const hasStdio = {
      stdin: Boolean(process.stdin),
      stdout: Boolean(process.stdout),
      stderr: Boolean(process.stderr),
      stdinIsTTY: process.stdin?.isTTY,
      stdoutIsTTY: process.stdout?.isTTY,
      stderrIsTTY: process.stderr?.isTTY
    };
    
    await logToFile('info', `Stdio access: ${JSON.stringify(hasStdio)}`);
  } catch (error) {
    await logToFile('error', `Failed to log environment info: ${error.message || String(error)}`);
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
  await logToFile('info', '-------------------------------------------');
  await logToFile('info', 'Oboard MCP server starting');
  await logToFile('info', `Log file location: ${LOG_FILE}`);
  await logToFile('info', '-------------------------------------------');
  
  // Log detailed environment information to help with debugging
  await logEnvironmentInfo();
  
  // Register handlers for process events to capture termination
  process.on('SIGINT', async () => {
    await logToFile('info', 'Received SIGINT signal. Shutting down...');
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await logToFile('info', 'Received SIGTERM signal. Shutting down...');
    process.exit(0);
  });
  
  process.on('uncaughtException', async (error) => {
    await logToFile('error', `Uncaught exception: ${error.message}\n${error.stack}`);
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    await logToFile('error', `Unhandled rejection: ${String(reason)}`);
    process.exit(1);
  });
  
  // Initialize the OboardClient
  await logToFile('info', 'Initializing OboardClient');
  const client = new OboardClient();
  
  // Check if API key and workspace ID are available
  const apiKeyAvailable = !!process.env.API_KEY;
  const workspaceIdAvailable = !!process.env.WORKSPACE_ID;
  await logToFile('info', `Configuration check: API_KEY=${apiKeyAvailable}, WORKSPACE_ID=${workspaceIdAvailable}`);
  
  let clientInitialized = false;
  
  if (apiKeyAvailable && workspaceIdAvailable) {
    try {
      await logToFile('info', 'Calling client.initialize()');
      await client.initialize();
      clientInitialized = true;
      await logToFile('info', 'OboardClient initialized successfully');
    } catch (error) {
      await logToFile('error', `Failed to initialize OboardClient: ${error.message || String(error)}`);
      if (error.stack) {
        await logToFile('error', `Stack trace: ${error.stack}`);
      }
      // Silently handle error
    }
  } else {
    await logToFile('warn', `Missing configuration: API_KEY=${apiKeyAvailable}, WORKSPACE_ID=${workspaceIdAvailable}`);
  }

  // Create the MCP server with logging capability
  await logToFile('info', 'Creating MCP server instance');
  const server = new McpServer({
    name: "oboard-mcp",
    version: "0.1.0"
  }, {
    capabilities: {
      logging: {}
    }
  });
  await logToFile('info', 'MCP server instance created');

  // Add the OKR tool
  await logToFile('info', 'Registering OKR tool');
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
      await logToFile('info', `OKR tool called with params: ${JSON.stringify(params)}`);
      
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
        await logToFile('info', 'Calling client.searchOKRs()');
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
        await logToFile('info', 'Formatting search results');
        const formattedResponse = formatOKRsForLLM(okrs);
        
        await logToFile('info', 'Returning formatted results');
        return {
          content: [{ type: "text", text: formattedResponse }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Log the error
        await logToFile('error', `Error searching OKRs: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          await logToFile('error', `Stack trace: ${error.stack}`);
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `Error searching OKRs: ${errorMessage}` 
          }]
        };
      }
    }
  );
  await logToFile('info', 'OKR tool registered');

  // Use stdio transport
  await logToFile('info', 'Creating StdioServerTransport');
  const transport = new StdioServerTransport();
  await logToFile('info', 'StdioServerTransport created');

  // Log that we're connecting to transport
  await logToFile('info', 'Connecting server to transport');

  try {
    // Connect the server to the transport
    await server.connect(transport);
    await logToFile('info', 'Server connected to transport and ready');
    
    // Set up message received logging
    transport.onMessage = async (message) => {
      try {
        // Truncate message for logging to prevent huge log files
        const messageStr = JSON.stringify(message);
        const truncated = messageStr.length > 500 ? messageStr.substring(0, 500) + '...' : messageStr;
        await logToFile('debug', `Received message: ${truncated}`);
      } catch (error) {
        // Ignore logging errors
      }
      
      // Pass the message to the default handler
      return transport.defaultOnMessage(message);
    };
  } catch (error) {
    await logToFile('error', `Failed to connect to transport: ${error.message || String(error)}`);
    if (error.stack) {
      await logToFile('error', `Stack trace: ${error.stack}`);
    }
    throw error; // Re-throw to handle in main try/catch
  }
}

// Run the server with robust error catching
(async function runServer() {
  try {
    // Log startup to the startup file
    try {
      const startupFile = path.join(os.homedir(), 'oboard-startup.log');
      const timestamp = new Date().toISOString();
      await fs.appendFile(startupFile, `[${timestamp}] About to call main()\n`);
    } catch (e) {
      // Ignore errors here, main() will handle logging
    }
    
    // Call the main function
    await main();
  } catch (error) {
    // Try to log to both files for redundancy
    try {
      const startupFile = path.join(os.homedir(), 'oboard-startup.log');
      const timestamp = new Date().toISOString();
      await fs.appendFile(startupFile, `[${timestamp}] Fatal error in runServer: ${error.message}\n`);
      if (error.stack) {
        await fs.appendFile(startupFile, `[${timestamp}] Stack trace: ${error.stack}\n`);
      }
    } catch (e) {
      // Fallback to sync file operations
      try {
        const fsSync = require('fs');
        fsSync.appendFileSync(path.join(os.homedir(), 'oboard-startup.log'), 
          `[${new Date().toISOString()}] Fatal error, failed to log: ${error.message}\n`);
      } catch (e2) {
        // Nothing more we can do
      }
    }
    
    // Try to log to the main log file too
    try {
      await logToFile('error', `Unhandled error in runServer: ${error.message || String(error)}`);
      if (error.stack) {
        await logToFile('error', `Stack trace: ${error.stack}`);
      }
    } catch {
      // Last resort - nothing more we can do
    }
    
    // Exit with error code
    process.exit(1);
  }
})();