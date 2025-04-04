# Oboard MCP Server

This project provides a Model Context Protocol (MCP) server that connects to the Oboard API and exposes OKR data for use by Large Language Models (LLMs).

## Overview

The Oboard MCP Server serves as a bridge between CMBlu's OKR data (managed in Jira via the Oboard plugin) and LLMs like Claude or GPT. It fetches data from the Oboard API and formats it for optimal consumption by LLMs, allowing them to provide context-aware responses about CMBlu's objectives and key results.

## Features

- Connects to Oboard API to fetch OKR data
- Exposes a single "OKR" tool for LLMs to query
- Supports filtering by search terms, dates, cycles, and teams
- Caches team and cycle data for improved performance
- Configurable via environment variables
- Uses stdio for MCP communication
- File-based logging for debugging without interfering with JSON-RPC

## API Integration

The server uses the Oboard API to fetch OKR data, with the following endpoints:

### Elements (OKRs and Key Results)

```
GET /v2/elements
```

**Parameters:**
- `workspaceIds` - ID of the workspace (required)
- `typeIds` - Type ID for the elements (1 for OKRs, 2 for Key Results)
- `searchType` - Set to '2' (required)
- `limit` - Number of results to return
- `search` - Text to search for in titles and descriptions
- `intervalIds` - Filter by specific interval/cycle ID

```
GET /v2/elements/{id}
```

**Parameters:**
- `workspaceIds` - ID of the workspace (required)
- `searchType` - Set to '2' (required)

### Intervals (Cycles)

```
GET /v1/intervals
```

**Parameters:**
- `workspaceId` - ID of the workspace (required, singular form)

### Groups (Teams)

```
GET /v1/groups
```

**Parameters:**
- `workspaceId` - ID of the workspace (required, singular form)

## Setup

1. Clone this repository
2. Install dependencies with `npm install`
3. Create a `.env` file with the following variables (see `.env.example` for more details):
```
API_KEY=your_api_key
WORKSPACE_ID=15346
OBOARD_API_BASE_URL=https://backend.okr-api.com/api
CACHE_TTL=3600
LOG_FILE=/path/to/your/log/file.log
```
4. Build the project with `npm run build`
5. Start the server with `npm start`

## Configuration

The server can be configured using environment variables:

- `API_KEY` - Your Oboard API key (required)
- `WORKSPACE_ID` - Your Oboard workspace ID (required, default: 15346)
- `OBOARD_API_BASE_URL` - Base URL for the Oboard API (default: https://backend.okr-api.com/api)
- `CACHE_TTL` - Time-to-live for the cache in seconds (default: 3600)
- `LOG_FILE` - Path to the log file (default: '~/oboard-mcp.log' in your home directory)

## Logging

The server implements comprehensive logging to help diagnose issues and monitor behavior. Two log files are used:

1. **Main Log File** (`LOG_FILE` in .env):
   - Records detailed operational logs
   - Configurable location via the `LOG_FILE` environment variable
   - Default location: `~/oboard-mcp.log` (in your home directory)

2. **Startup Log** (fixed location):
   - Records very early initialization information
   - Fixed location: `~/oboard-startup.log` (in your home directory)
   - Useful for debugging startup issues

Log entries include:
- Timestamps
- Log levels (INFO, WARN, ERROR, DEBUG)
- Server events and environment information
- API requests and responses
- Search parameters and results
- Error details with stack traces

The logging is designed to work with JSON-RPC communication without interference, making it suitable for use with MCP clients like Claude.

## MCP Integration

To integrate with Claude or other MCP clients:

1. Configure your MCP client to point to the server. For Cursor, add this to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "oboard": {
      "command": "node",
      "args": ["/path/to/oboard_mcp/dist/server.js"],
      "description": "MCP server for Oboard OKR data", 
      "transportType": "stdio",
      "env": {}
    }
  }
}
```

2. Make sure your `.env` file is properly configured with your API credentials and desired settings.

3. Build the project with `npm run build` to generate the JavaScript files.

4. The MCP client will automatically start the server when needed.

## Debugging

If you encounter issues with the MCP integration:

1. Check both log files (`~/oboard-mcp.log` and `~/oboard-startup.log`) for error messages
2. Verify that your `.env` file contains the correct API credentials
3. Ensure the path in your MCP client configuration points to the correct location of the server.js file
4. Try running the server directly with `node dist/server.js` to see if it starts properly

## MCP Tool: OKR

The server exposes a single MCP tool:

```json
{
  "name": "OKR",
  "description": "Research OKR data",
  "params": {
    "searchString": "Text to search for in OKR titles or descriptions",
    "startDateFrom": "Filter for OKRs with start date after this date",
    "startDateTo": "Filter for OKRs with start date before this date",
    "dueDateFrom": "Filter for OKRs with due date after this date",
    "dueDateTo": "Filter for OKRs with due date before this date",
    "cycle": "Filter for OKRs in a specific cycle (current, previous, all, or YYYY-Q#)",
    "team": "Filter for OKRs from a specific team (e.g., Posolyt, Marketing)"
  }
}
```

All parameters are optional. The tool returns a formatted text response containing the matching OKRs.

## Special Parameters

### cycle

The `cycle` parameter accepts the following values:
- `current` - Current OKR cycle
- `previous` - Previous OKR cycle
- `all` - All OKR cycles
- Specific cycle name (e.g., "2024-Q1")

### team

The `team` parameter accepts team names (e.g., "Posolyt", "Marketing"). The server handles team filtering in memory since the API doesn't support direct filtering by team name.

## Date Formatting

Date parameters (`startDateFrom`, `startDateTo`, `dueDateFrom`, `dueDateTo`) should be in a format that can be parsed by JavaScript's `Date` constructor. The server converts valid dates to ISO format (`yyyy-MM-dd'T'HH:mm:ss.SSSX`) for the API. If date conversion fails, the parameter is ignored.

## Docker

This project includes a Dockerfile for containerization. Build and run with:

```
docker build -t oboard-mcp .
docker run oboard-mcp
```

## Testing

To test the server with sample queries:

1. Start the server with: `npm start`
2. Use an MCP client (like MCP Explorer) to send queries
3. Try sample queries like:
   - "What is team Posolyt objective for this cycle?"
   - "What were the objectives for the last cycle?"
   - "What key results has team Posolyt with regards to DN-0006?"

## Project Structure

The project is organized as follows:

- `src/server.ts` - Main MCP server implementation
- `src/oboard/` - Oboard API client implementation
  - `oboardClient.ts` - Main client for interacting with Oboard API
  - `types.ts` - TypeScript type definitions
  - Other utility files for specific API endpoints

## License

MIT 