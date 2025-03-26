import 'dotenv/config';
import { OboardApi, ElementSearchType } from './index.js';
import { Command } from 'commander';
import { Group, Interval } from './types.js';

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

// Create API client instance
const api = new OboardApi({
  baseUrl: OBOARD_API_URL,
  token: OBOARD_API_TOKEN
});

// Helper function to get items from response (handles both array and object responses)
const getItems = (response: any): any[] => {
  if (Array.isArray(response)) {
    return response;
  }
  return response?.items || [];
};

// Define a function to display elements in a nice format
const displayElements = (elements: any[]) => {
  if (elements.length === 0) {
    console.log('No elements found matching your search criteria.');
    return;
  }

  console.log(`Found ${elements.length} elements:`);
  elements.forEach((element, index) => {
    console.log(`\n[${index + 1}] ${element.name} (ID: ${element.id})`);
    console.log(`Type: ${getElementTypeName(element.type)}`);
    
    if (element.owner) {
      console.log(`Owner: ${element.owner.displayName}`);
    }
    
    if (element.gradeType) {
      console.log(`Status: ${getGradeTypeName(element.gradeType)}`);
    }
    
    if (element.description) {
      console.log(`Description: ${element.description.substring(0, 100)}${element.description.length > 100 ? '...' : ''}`);
    }
    
    if (element.labels && element.labels.length > 0) {
      console.log(`Labels: ${element.labels.map((label: any) => label.name).join(', ')}`);
    }
    
    if (element.startDate || element.dueDate) {
      console.log(`Timeframe: ${element.startDate || 'N/A'} to ${element.dueDate || 'N/A'}`);
    }
  });
};

// Helper function to get element type name
const getElementTypeName = (type: number): string => {
  switch (type) {
    case 1: return 'Objective';
    case 4: return 'Key Result';
    case 5: return 'Jira Issue';
    default: return `Unknown (${type})`;
  }
};

// Helper function to get grade type name
const getGradeTypeName = (gradeType: number): string => {
  switch (gradeType) {
    case 1: return 'On Track';
    case 2: return 'Behind';
    case 3: return 'At Risk';
    case 4: return 'Not Started';
    case 5: return 'Closed';
    case 6: return 'Abandoned';
    case 9: return 'Backlog';
    default: return `Unknown (${gradeType})`;
  }
};

/**
 * Main function that searches for elements based on command line arguments
 */
async function searchElements(searchString: string, cycleFilter?: string, teamFilter?: string) {
  try {
    // Get all intervals (cycles) to find the matching one if specified
    let intervalId: number | undefined;
    if (cycleFilter) {
      const intervals = await api.intervals.getIntervals();
      const intervalList = getItems(intervals);
      const matchingInterval = intervalList.find((interval: Interval) => 
        interval.name.toLowerCase().includes(cycleFilter.toLowerCase()));
      
      if (matchingInterval) {
        console.log(`Found matching cycle: ${matchingInterval.name} (ID: ${matchingInterval.id})`);
        intervalId = matchingInterval.id;
      } else {
        console.warn(`Warning: No cycle found matching "${cycleFilter}"`);
      }
    }

    // Get all groups (teams) to find the matching one if specified
    let groupId: number | undefined;
    if (teamFilter) {
      const groups = await api.groups.getGroups();
      const groupList = getItems(groups);
      const matchingGroup = groupList.find((group: Group) => 
        group.name.toLowerCase().includes(teamFilter.toLowerCase()));
      
      if (matchingGroup) {
        console.log(`Found matching team: ${matchingGroup.name} (ID: ${matchingGroup.id})`);
        groupId = matchingGroup.id;
      } else {
        console.warn(`Warning: No team found matching "${teamFilter}"`);
      }
    }

    // Search for elements with the provided filters
    const elementSearchParams = {
      searchType: ElementSearchType.Explorer,
      searchString,
      ...(intervalId ? { intervalIds: [intervalId] } : {}),
      ...(groupId ? { groupIds: [groupId] } : {}),
      expandAll: true,
      limit: 20 // Limit results to prevent overwhelming output
    };

    console.log('Searching for elements...');
    const elements = await api.elements.getElements(elementSearchParams);
    const elementList = getItems(elements);
    
    // Display the results
    displayElements(elementList);
    
  } catch (error) {
    console.error('Error searching for elements:', error);
    process.exit(1);
  }
}

// Set up the command line interface
const program = new Command();

program
  .name('oboard-search')
  .description('Search for Oboard elements with optional filters')
  .version('1.0.0')
  .argument('<search-string>', 'Text to search for in element names and descriptions')
  .option('-c, --cycle <cycle-name>', 'Filter by cycle name (interval)')
  .option('-t, --team <team-name>', 'Filter by team name (group)')
  .action((searchString: string, options: { cycle?: string; team?: string }) => {
    if (!searchString) {
      console.error('Error: Search string is required');
      program.help();
    }
    
    searchElements(searchString, options.cycle, options.team).then(() => {
      console.log('\nSearch completed.');
    }).catch((error) => {
      console.error('Search failed:', error);
    });
  });

// Parse command line arguments
program.parse(); 