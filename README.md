# Oboard MCP Server

This project provides a Model Context Protocol (MCP) server that connects to the Oboard API and exposes tools for working with OKR data.

## API Endpoints

The following are the correct Oboard API endpoints used by this client:

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
- `teamIds` - Filter by specific team ID

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
3. Create a `.env` file with the following variables:
```
API_KEY=your_api_key
WORKSPACE_ID=your_workspace_id
OBOARD_API_BASE_URL=https://backend.okr-api.com/api
```
4. Build the project with `npm run build`
5. Start the server with `npm start`

## Available Tools

- `search_okrs` - Search for OKRs with optional filters
- `get_okr` - Get a specific OKR by ID
- `get_cycles` - Get available OKR cycles
- `get_teams` - Get available teams

## Testing

Run the demo client to test the API integration:

```
npm run client:demo
```

Run tests with:

```
npm test
```

## Docker

This project includes a Dockerfile for containerization. Build and run with:

```
docker build -t oboard-mcp .
docker run -p 8080:8080 oboard-mcp
```

## License

MIT 