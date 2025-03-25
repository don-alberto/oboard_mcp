import 'dotenv/config';
import { OboardApi, ElementSearchType } from './index.js';

// Map the variable names from the .env file to the ones expected by our client
const OBOARD_API_URL = process.env.OBOARD_API_BASE_URL || process.env.OBOARD_API_URL;
const OBOARD_API_TOKEN = process.env.API_KEY || process.env.OBOARD_API_TOKEN;

// Check for required environment variables
if (!OBOARD_API_TOKEN || !OBOARD_API_URL) {
  console.error('Missing required environment variables:');
  if (!OBOARD_API_TOKEN) console.error('- API_KEY or OBOARD_API_TOKEN');
  if (!OBOARD_API_URL) console.error('- OBOARD_API_BASE_URL or OBOARD_API_URL');
  process.exit(1);
}

console.log(`Using API URL: ${OBOARD_API_URL}`);
console.log(`Using API token: ${OBOARD_API_TOKEN.substring(0, 5)}...`);

if (process.env.WORKSPACE_ID) {
  console.log(`Using workspace ID from environment: ${process.env.WORKSPACE_ID}`);
}

// Create API client instance
const api = new OboardApi({
  baseUrl: OBOARD_API_URL,
  token: OBOARD_API_TOKEN
});

// Simple wrapper to display results
const display = (title: string, data: any) => {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
  console.log();
};

// Helper function to get items from response (handles both array and object responses)
const getItems = (response: any): any[] => {
  if (Array.isArray(response)) {
    return response;
  }
  return response?.items || [];
};

// Helper function to check if a response has items
const hasItems = (response: any): boolean => {
  return Array.isArray(response) ? response.length > 0 : (response?.items?.length > 0);
};

// Helper function to display an error
const logError = (message: string, error: unknown): void => {
  console.error(message, error instanceof Error ? error.message : String(error));
};

/**
 * Demo various API operations
 */
async function runDemo() {
  try {
    // Get workspaces
    const workspaces = await api.workspaces.getWorkspaces();
    display('Workspaces', workspaces);

    // Note: The following calls automatically use workspace ID from environment
    // when it's available

    // Get elements in the workspace (v3)
    const elements = await api.elements.getElements({
      searchType: ElementSearchType.Explorer,
      limit: 5,
      expandAll: true
    });
    display('Elements', elements);

    // Get nested elements if there are elements
    if (hasItems(elements)) {
      const elementsList = getItems(elements);
      if (elementsList.length > 0) {
        const parentId = elementsList[0].id;
        try {
          const nestedElements = await api.elements.getNestedElements({
            searchType: ElementSearchType.Explorer,
            parentIds: [parentId],
            limit: 5
          });
          display('Nested Elements', nestedElements);
        } catch (error: unknown) {
          logError('Error getting nested elements:', error);
        }
      }
    }

    try {
      // Get groups in the workspace (v2)
      // workspaceId is automatically added from environment
      const groups = await api.groups.getGroups();
      display('Groups', groups);
    } catch (error: unknown) {
      logError('Error getting groups:', error);
    }

    try {
      // Get intervals in the workspace (v1)
      // workspaceId is automatically added from environment
      const intervals = await api.intervals.getIntervals();
      display('Intervals', intervals);
    } catch (error: unknown) {
      logError('Error getting intervals:', error);
    }

    // try {
    //   // Get users (v1)
    //   const users = await api.users.getUsers({ workspaceId });
    //   display('Users', users);
    // } catch (error: unknown) {
    //   logError('Error getting users:', error);
    // }

    // try {
    //   // Get labels in the workspace (v2)
    //   const labels = await api.labels.getLabels({ workspaceId });
    //   display('Labels', labels);
    // } catch (error: unknown) {
    //   logError('Error getting labels:', error);
    // }

    // try {
    //   // Get levels in the workspace (v2)
    //   const levels = await api.levels.getLevels({ workspaceId });
    //   display('Levels', levels);
    // } catch (error: unknown) {
    //   logError('Error getting levels:', error);
    // }
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

// Run the demo
runDemo().then(() => {
  console.log('Demo completed');
}).catch((error) => {
  console.error('Demo failed:', error);
}); 