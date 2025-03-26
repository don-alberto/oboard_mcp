# Oboard MCP Server - Product Requirements Document

## Overview

The Oboard MCP Server provides an integration between the CMBlu OKR data (managed in Jira via the Oboard plugin) and Large Language Models (LLMs) through the Model Context Protocol (MCP). This allows LLMs to query and retrieve OKR data to provide context-aware responses about CMBlu's objectives and key results.

## Background

- CMBlu's OKR data is managed in Jira using the Oboard plugin
- The data isn't stored in regular Jira artifacts, making it inaccessible via the standard Jira API
- The data is accessible through Oboard's API: https://www.postman.com/oboard-api/public-api-oboard/overview
- To make this data available to LLMs, we need to wrap the Oboard API in an MCP server

## User Story

**As a** cmblu GPT user  
**I want to** enable cmblu GPT to have the OKR context  
**So that** it knows actual things about CMBlu beyond public info.

## MCP Tool Implementation

The MCP server will expose a single tool:

```
{
  name: "OKR", 
  description: "Research OKR data",
  inputSchema: {
    "type": "object",
    "properties": {
      "searchString": {"type": "string"},
      "startDateFrom": {"type": "string"},
      "startDateTo": {"type": "string"},
      "dueDateFrom": {"type": "string"},
      "dueDateTo": {"type": "string"},
      "cycle": {"type": "string"}, // current|previous|all|YYYY-Q#
      "team": {"type": "string"}  // Posolyt, Marketing, etc.
    },
    "required": []
  }
}
```

## Technical Requirements

### API Integration

1. **Workspace ID**
   - Fixed to 15346 (configured in .env file)
   - Should be configurable for flexibility

2. **API Authentication**
   - API key stored in .env file
   - Should eventually be stored in a vault

3. **Search Parameters**
   - `searchString`: Text to search within OKR data
   - `startDateFrom`, `startDateTo`: Date range for OKR start dates
   - `dueDateFrom`, `dueDateTo`: Date range for OKR due dates
   - `cycle`: OKR cycle identifier (current, previous, all, or specific cycle like "2024-Q1")
   - `team`: Team name for filtering (e.g., "Posolyt", "Marketing")

4. **Parameter Handling**
   - Date parameters: Convert to format `yyyy-MM-dd'T'HH:mm:ss.SSSX` (e.g., "2023-08-04T09:10:40.326Z")
   - If conversion fails, ignore the parameter
   - `cycle` parameter should be a string
   - All parameters are optional

### Data Processing

1. **Cycles and Teams Lookup**
   - Perform lookup for cycles and teams on startup
   - Cache the results for efficient access
   - Implement caching following best practices
   - Cache invalidation should be appropriate for the type of data

2. **Team Filtering**
   - The API doesn't filter by team directly
   - Implement in-memory filtering for team parameter

3. **Error Handling**
   - If API key or workspace ID is missing, return an appropriate message in the tool response
   - Message should indicate that connection to Oboard is not possible

### Response Formatting

1. **Response Fields**
   - Include the following fields in a human-readable format:
     - displayId
     - name
     - groups.name
     - levelName
     - customFields (if not empty)
     - intervalName
     - grade
   - Format the data in a way most suitable for LLM context

2. **Response Structure**
   - Present data in a clear, structured format
   - Use hierarchical organization where appropriate
   - Format for easy consumption by LLMs

## Containerization

1. The MCP server must be containerized for easy deployment
2. Container should handle environment variables appropriately
3. Container should be optimized for size and performance

## Communication Protocol

1. The MCP server must implement the Server-Sent Events (SSE) transport
2. Must adhere to the MCP specification for request/response handling

## Sample Queries for Testing

- "What is team Posolyt objective for this cycle?"
- "What were the objectives for the last cycle?"
- "What key results has team Posolyt with regards to DN-0006?"
- "What OKRs do we have for PBR tank?"

## Implementation Checklist

- [ ] Setup basic MCP server structure
- [ ] Implement Oboard API client
- [ ] Add caching for cycles and teams
- [ ] Implement the OKR tool
- [ ] Add parameter validation and conversion
- [ ] Implement in-memory team filtering
- [ ] Format responses for LLM consumption
- [ ] Add error handling
- [ ] Containerize the application
- [ ] Create documentation
- [ ] Test with sample queries 