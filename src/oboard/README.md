# Oboard API Client

A TypeScript client for the Oboard API that provides read-only access to Oboard resources.

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
OBOARD_API_URL=https://backend.okr-api.com/api
OBOARD_API_TOKEN=your_api_token_here
```

To get an API token:

1. Open Oboard app
2. Go to Settings/Integrations/API Tokens
3. Select create token
4. Enter token name
5. Select create
6. Copy token and use it in your environment variables

## Usage

### Initializing the API Client

```typescript
import { OboardApi } from './oboard/index.js';
import 'dotenv/config';

const api = new OboardApi({
  baseUrl: process.env.OBOARD_API_URL,
  token: process.env.OBOARD_API_TOKEN,
  defaultWorkspaceId: 12345 // Optional, can also be set in environment
});
```

### Getting Workspaces

```typescript
// Get all workspaces
const workspaces = await api.workspaces.getWorkspaces();

// Get a specific workspace
const workspace = await api.workspaces.getWorkspace(workspaceId);
```

### Getting Elements (OKRs)

```typescript
import { ElementSearchType } from './oboard/types.js';

// Get elements with filtering
const elements = await api.elements.getElements({
  searchType: ElementSearchType.Explorer,
  workspaceId: 12345,
  expandAll: true,
  limit: 10
});

// Get a specific element
const element = await api.elements.getElement(67890);
```

### Getting Users

```typescript
// Get all users
const users = await api.users.getUsers();

// Get current user
const currentUser = await api.users.getCurrentUser();

// Get a specific user
const user = await api.users.getUser('user-id');
```

### Getting Groups

```typescript
// Get all groups in a workspace
const groups = await api.groups.getGroups({ workspaceId: 12345 });

// Get a specific group
const group = await api.groups.getGroup(67890);
```

### Getting Intervals

```typescript
// Get all intervals in a workspace
const intervals = await api.intervals.getIntervals({ workspaceId: 12345 });

// Get a specific interval
const interval = await api.intervals.getInterval(67890);
```

### Getting Labels

```typescript
// Get all labels in a workspace
const labels = await api.labels.getLabels({ workspaceId: 12345 });

// Get a specific label
const label = await api.labels.getLabel(67890);
```

### Getting Levels

```typescript
// Get all levels in a workspace
const levels = await api.levels.getLevels({ workspaceId: 12345 });

// Get a specific level
const level = await api.levels.getLevel(67890);
```

## Running the Demo

To run the demo application that shows how to use the API client:

```bash
npm run client:demo
```

This will run `src/api/client-demo.ts` which demonstrates various API calls.

## Note

This is a read-only API client that only includes GET operations. POST, PUT, PATCH, and DELETE operations have been removed intentionally to ensure the client doesn't make any changes to the Oboard data. 