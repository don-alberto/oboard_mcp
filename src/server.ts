// @ts-nocheck
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from 'dotenv';
import process from 'node:process';
import { OboardClient } from './api/oboardClient.js';

dotenv.config();

// TypeScript type definitions
interface ToolRequest {
  name: string;
  params: Record<string, any>;
}

interface ToolResponse {
  isError: boolean;
  result?: {
    type: string;
    text: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface ResourceRequest {
  name: string;
}

interface ResourceResponse {
  isError: boolean;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Initialize the OboardClient
const client = new OboardClient();

// Direct code from MCP examples
async function main() {
  // Create the server
  const server = new McpServer({
    name: "oboard-mcp",
    version: "0.1.0"
  });

  // Add OKR search tool
  server.tool(
    "search_okrs",
    {
      searchString: z.string().optional().describe("Text to search for in OKR titles or descriptions"),
      cycle: z.string().optional().describe("The OKR cycle, e.g., '2024-Q1' or '2024-Q2'"),
      team: z.string().optional().describe("Team name to filter OKRs by")
    },
    async ({ searchString, cycle, team }) => {
      try {
        // Use the OboardClient to search for OKRs
        const okrs = await client.searchOKRs({
          searchString,
          cycle,
          team
        });
        
        // Format the results in a readable way
        if (okrs.length === 0) {
          return {
            content: [{ type: "text", text: "No OKRs found matching the specified criteria." }]
          };
        }
        
        // Build a formatted text response
        let resultText = `Found ${okrs.length} OKRs:\n\n`;
        
        okrs.forEach(okr => {
          resultText += `## ${okr.title} (ID: ${okr.id})\n`;
          resultText += `- **Status**: ${okr.status}\n`;
          resultText += `- **Team**: ${okr.team}\n`;
          resultText += `- **Cycle**: ${okr.cycle}\n`;
          resultText += `- **Description**: ${okr.description}\n\n`;
          
          if (okr.keyResults.length > 0) {
            resultText += "**Key Results**:\n";
            okr.keyResults.forEach(kr => {
              resultText += `- ${kr.title} (${kr.progress}% complete)\n`;
            });
          }
          
          resultText += "\n---\n\n";
        });
        
        return {
          content: [{ type: "text", text: resultText }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching OKRs: ${error.message}` }]
        };
      }
    }
  );
  
  // Add get_okr tool
  server.tool(
    "get_okr",
    {
      id: z.string().describe("ID of the OKR to retrieve")
    },
    async ({ id }) => {
      try {
        // Use the OboardClient to get a specific OKR
        const okr = await client.getOKR(id);
        
        // Format the result in a readable way
        let resultText = `# ${okr.title} (ID: ${okr.id})\n\n`;
        resultText += `- **Status**: ${okr.status}\n`;
        resultText += `- **Team**: ${okr.team}\n`;
        resultText += `- **Cycle**: ${okr.cycle}\n`;
        resultText += `- **Description**: ${okr.description}\n\n`;
        
        if (okr.keyResults.length > 0) {
          resultText += "## Key Results\n\n";
          okr.keyResults.forEach(kr => {
            resultText += `- ${kr.title} (${kr.progress}% complete)\n`;
          });
        }
        
        return {
          content: [{ type: "text", text: resultText }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting OKR: ${error.message}` }]
        };
      }
    }
  );
  
  // Add get_cycles tool
  server.tool(
    "get_cycles",
    {},
    async () => {
      try {
        // Use the OboardClient to get cycles
        const cycles = await client.getCycles();
        
        if (cycles.length === 0) {
          return {
            content: [{ type: "text", text: "No OKR cycles found." }]
          };
        }
        
        const resultText = `Available OKR cycles:\n\n${cycles.map(cycle => `- ${cycle}`).join('\n')}`;
        
        return {
          content: [{ type: "text", text: resultText }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting cycles: ${error.message}` }]
        };
      }
    }
  );
  
  // Add get_teams tool
  server.tool(
    "get_teams",
    {},
    async () => {
      try {
        // Use the OboardClient to get teams
        const teams = await client.getTeams();
        
        if (teams.length === 0) {
          return {
            content: [{ type: "text", text: "No teams found." }]
          };
        }
        
        const resultText = `Available teams:\n\n${teams.map(team => `- ${team}`).join('\n')}`;
        
        return {
          content: [{ type: "text", text: resultText }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting teams: ${error.message}` }]
        };
      }
    }
  );

  // Set up the transport
  const transport = new StdioServerTransport();
  
  // Connect the server to the transport
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Error in MCP server:", error);
  process.exit(1);
}); 