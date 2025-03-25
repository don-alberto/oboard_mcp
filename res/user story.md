**As a** cmblu GPT user  
**I want to** enable cmblu GPT to have the OKR context  
**Such that** it knows actual things about CMBlu beyond public info.

## Background

The cmblu OKR data is managed in Jira, but with a specific plugin (Oboard). This plugin doesn’t store its data in Jira artifacts, thus this data is not available through Jira API. This renders the use of Atlassian-MCP useless

The data is available through [https://www.postman.com/oboard-api/public-api-oboard/overview](https://www.postman.com/oboard-api/public-api-oboard/overview "smart-link")

To be able to feed it into LLM context, it needs to be wrapped in MCP server.

MCP Server exposes following tools:
```json
{ name="OKR", description="Research OKR data", inputSchema={ "type": "object", "properties": { "searchString": {"type": "String"}, "startDateFrom": {"type": "String"} "startDateTo": {"type": "String"}, "startDateFrom": {"type": "String"} "dueDateFrom": {"type": "String"}, "dueDateTo": {"type": "String"} "cycle": {"type": "String"}, //current|previous|all|YYYY-Q\#  "team": {"type": "String"} //Posolyt, Marketing, ... }, "required": \[\] } } 
```

## Acceptance criteria:

1.  MCP server :
    1.  SSE transport
    2.  containerized
    3.  Exposes the required tools
    4.  Returns the contents of retrieved Elements

1.  Workspace ID is fixed to 15346(configurable)
2.  The API key is stored in env (later in vault)
3.  Note:
    1.  for cycle (API:Interval) and team (API: group) the server must perform a lookup (maybe on startup and then cache?).
    2.  API doesn’t filter by team, in memory filtering required

Sample queries for GPT:

*   What is team Posolyt objective to this cycle? last cycle? What key results has the team Posolyt with regards to DN-0006 What okrs do we have for PBR tank?