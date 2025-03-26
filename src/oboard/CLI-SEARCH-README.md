# Oboard CLI Search Tool

This command-line tool allows you to search for elements in your Oboard workspaces with optional filtering.

## Setup

1. Ensure you have a `.env` file in the project root with the following variables:
   ```
   OBOARD_API_BASE_URL=https://your-oboard-instance.com/api
   API_KEY=your_api_token
   WORKSPACE_ID=your_default_workspace_id (optional)
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

Basic search:
```
npm run search "your search term"
```

Search with optional filters:
```
npm run search -- "your search term" --cycle "Q2 2023" --team "Engineering"
```

### Command Options

- `<search-string>`: Required. Text to search for in element names and descriptions.
- `-c, --cycle <cycle-name>`: Optional. Filter by cycle name (maps to interval in Oboard API).
- `-t, --team <team-name>`: Optional. Filter by team name (maps to group in Oboard API).
- `-h, --help`: Show help information.

## Examples

Search for all elements containing "product roadmap":
```
npm run search "product roadmap"
```

Search for elements containing "OKR" in the "Q1 2023" cycle:
```
npm run search -- "OKR" --cycle "Q1 2023"
```

Search for elements containing "milestone" for the "Marketing" team:
```
npm run search -- "milestone" --team "Marketing"
```

Search with both cycle and team filters:
```
npm run search -- "launch" --cycle "Q2 2023" --team "Product"
```

## Notes

- The search is case-insensitive for both the search term and filter values.
- Partial matches are supported for cycle and team names.
- Results are limited to 20 items to prevent overwhelming output. 