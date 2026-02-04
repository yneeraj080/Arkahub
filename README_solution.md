# EnergyGrid Data Aggregator Solution

This is a Node.js client application that fetches real-time telemetry data from 500 solar inverters while respecting strict rate limits and security protocols.

## Features

- Generates 500 dummy serial numbers (SN-000 to SN-499)
- Batches requests (max 10 devices per request)
- Implements 1 request per second rate limiting
- Custom MD5 signature authentication
- Error handling with retries for rate limits and network failures
- Aggregates results into a summary report

## Prerequisites

- Node.js (v14 or higher)
- The mock API server running (see setup below)

## Setup and Run

### 1. Start the Mock API Server

First, install dependencies and start the mock server:

```bash
npm install
node server.js
```

The server will start on `http://localhost:3000`.

### 2. Run the Data Aggregator Client

In a separate terminal:

```bash
node client.js
```

## Approach

### Architecture
The solution is structured with clear separation of concerns:

- **Serial Number Generation**: Simple loop to create SN-000 to SN-499
- **Batching Logic**: Groups SNs into arrays of 10 for API compliance
- **Authentication**: MD5 signature generation using crypto module
- **Rate Limiting**: 1-second delays between requests using Promises and setTimeout
- **Error Handling**: Retry logic with exponential backoff for 429s and network errors
- **Aggregation**: Summarizes total devices, online/offline counts, and power metrics

### Rate Limiting Implementation
- Uses async/await with Promise-based delays
- Maintains exactly 1 request per second
- Includes retry mechanism with increasing delays on failures
- Always enforces minimum 1s gap even after retries

### Security
- Implements required MD5 signature: `MD5(URL + Token + Timestamp)`
- Uses Node.js built-in crypto module for hashing
- Generates fresh timestamp for each request

### Error Handling
- Catches HTTP errors (401, 429, etc.)
- Implements up to 3 retries with progressive delays
- Logs errors for debugging
- Continues processing other batches if one fails

## Output

The program outputs:
- Progress indicators for each batch
- Final aggregation summary (total devices, online/offline counts, total power)
- Sample device data for verification

Example output:
```
Aggregation Summary:
{
  "totalDevices": 500,
  "onlineDevices": 444,
  "offlineDevices": 56,
  "totalPower": "1253.36 kW"
}
```

## Assumptions

- Mock API server is running on localhost:3000
- Network connectivity is stable (retries handle temporary issues)
- System clock is accurate for timestamp generation
- All 500 devices exist and are accessible (no filtering for invalid SNs)

## Files

- `client.js` - Main client application
- `server.js` - Mock API server (provided)
- `README_solution.md` - This documentation
- `instructions.md` - Original assignment
- `package.json` - Dependencies for mock server