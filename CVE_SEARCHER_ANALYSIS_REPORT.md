# CVE Searcher - Detailed Technical Analysis Report

## Executive Summary

**CONFIRMED:** The CVE searcher is currently fetching **REAL data from the National Vulnerability Database (NVD) API**, not dummy/mock data. 

I tested your local instance at `http://localhost:3000/api/cves/search?q=React` and confirmed it returns actual CVE records from NVD's live API. The 20 CVEs you mentioned (CVE-2007-1724, CVE-2018-6342, etc.) are **legitimate, real vulnerabilities** from NIST's official database.

The system is working as designed - it's a production-ready CVE search engine that queries live vulnerability data using your configured NVD API key.

---

## Current System Architecture

### 1. **Frontend Layer** (`src/modules/cve-search/ui/CveSearchPageClient.tsx`)

**What it does:**
- Provides a search interface with filters (severity, year, KEV status, sort options)
- Captures user input and debounces it (300ms delay) to avoid excessive API calls
- Manages URL query parameters for shareable/bookmarkable searches
- Displays results in a paginated list with CVE details

**Key Features:**
- Search input field for keywords, CVE IDs, products, vendors
- Filters: Severity (Critical/High/Medium/Low), Year ranges, KEV (Known Exploited Vulnerabilities)
- Sort options: Relevance, Newest, Recently Updated, Highest CVSS
- Pagination with configurable page sizes (10, 20, 50 results per page)

**API Call:**
```typescript
fetch(`/api/cves/search?${requestQuery.toString()}`, {
  method: "POST",
  signal: controller.signal,
  cache: "no-store",
  headers: { Accept: "application/json" }
})
```

---

### 2. **API Route Layer** (`src/app/api/cves/search/route.ts`)

**What it does:**
- Receives search requests from the frontend
- Parses query parameters from the URL
- Delegates to the `CveSearchService` for actual search logic
- Returns JSON responses with CVE data

**Request Flow:**
```
User Input → Frontend → /api/cves/search → CveSearchService → NVD API → Response
```

---

### 3. **Service Layer** (`src/modules/cve-search/api/service.ts`)

**What it does:**
- Core business logic for CVE searching
- Implements caching (TTL-based) to reduce API calls
- Coordinates multiple data sources (currently only NVD)
- Handles circuit breakers for resilience
- Deduplicates, filters, ranks, and paginates results

**Key Components:**

#### **CveSearchService Class:**
- `search(query)` - Main search method
- `getById(cveId)` - Fetch specific CVE by ID
- Caching: 300s for search results, 400s for detail pages
- Request coalescing to prevent duplicate concurrent requests

#### **Search Pipeline:**
1. **Cache Check** - Return cached results if available
2. **Fetch from NVD** - Query the NVD API adapter
3. **Deduplicate** - Merge duplicate CVE records
4. **Validate** - Ensure data integrity
5. **Filter** - Apply user filters (severity, date range, KEV)
6. **Rank** - Sort by relevance, date, or CVSS score
7. **Paginate** - Return requested page of results
8. **Cache** - Store results for future requests

---

### 4. **NVD Adapter Layer** (`src/modules/cve-search/adapters/nvd-adapter.ts`)

**What it does:**
- **THIS IS WHERE THE REAL DATA COMES FROM**
- Makes HTTP requests to the official NVD API
- Transforms NVD's response format into normalized CVE objects
- Handles CVE ID searches vs keyword searches

**NVD API Endpoint:**
```
https://services.nvd.nist.gov/rest/json/cves/2.0
```

**Query Parameters:**
- `cveId` - For exact CVE ID lookups (e.g., CVE-2024-1234)
- `keywordSearch` - For text searches (e.g., "React")
- `startIndex` - Pagination offset
- `resultsPerPage` - Number of results per page
- `pubStartDate` / `pubEndDate` - Date range filters

**Example Request for "React":**
```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=React&startIndex=0&resultsPerPage=20
```

**Data Transformation:**
- Extracts CVE ID, description, severity, CVSS scores
- Parses CPE (Common Platform Enumeration) data
- Normalizes dates to ISO format
- Extracts references and metadata

---

### 5. **Database Service Layer** (`src/modules/cve-search/api/db-service.ts`)

**What it does:**
- **Alternative data source** (not currently used by default)
- Queries a local PostgreSQL database with ingested CVE data
- Provides faster searches with more advanced filtering
- Includes EPSS (Exploit Prediction Scoring System) data
- Includes KEV (Known Exploited Vulnerabilities) enrichment

**Note:** The system has TWO data sources:
1. **NVD API** (live, real-time, currently active)
2. **Local Database** (requires ingestion, faster, more features)

---

## Why You're Seeing Real Data (Not Dummy Data)

### The Search Flow for "React":

1. **User types "React"** in the search box
2. **Frontend debounces** for 300ms, then makes API call:
   ```
   POST /api/cves/search?q=React&page=1&pageSize=20&sort=RELEVANCE
   ```
3. **API route** parses the query and calls `CveSearchService.search()`
4. **Service checks cache** - if not cached, proceeds to fetch
5. **NVD Adapter makes HTTP request** to NVD API:
   ```
   GET https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=React&startIndex=0&resultsPerPage=20
   ```
6. **NVD API returns real CVE data** matching "React" keyword
7. **Adapter normalizes** the NVD response format
8. **Service ranks and filters** the results
9. **Response sent to frontend** with actual CVE records

### The 20 CVEs You Listed Are REAL:

All the CVEs you mentioned (CVE-2007-1724, CVE-2018-6342, etc.) are **legitimate vulnerabilities** from the National Vulnerability Database:

- **CVE-2007-1724** - ReactOS vulnerability (real)
- **CVE-2018-6342** - react-dev-utils RCE vulnerability (real)
- **CVE-2019-12164** - Status React Native Desktop RCE (real)
- **CVE-2020-7787** - react-adal JWT validation issue (real)
- And so on...

These are not dummy data - they are actual security vulnerabilities that have been disclosed and documented.

---

## How to Implement Dummy/Mock Data

If you want to return dummy data instead of real NVD data, you have several options:

### **Option 1: Mock the NVD Adapter (Recommended for Testing)**

Create a mock adapter that returns hardcoded data:

```typescript
// src/modules/cve-search/adapters/mock-nvd-adapter.ts
export class MockNvdAdapter implements SourceAdapter {
  async search(query: string, options: AdapterSearchOptions): Promise<AdapterResult> {
    return {
      cves: [
        {
          cveId: "CVE-2024-MOCK-001",
          title: "Mock Vulnerability",
          description: "This is a mock CVE for testing purposes",
          published: "2024-01-01T00:00:00.000Z",
          lastModified: "2024-01-01T00:00:00.000Z",
          severity: "CRITICAL",
          cvss: { version: "3.1", baseScore: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" },
          // ... more fields
        },
        // Add 19 more mock CVEs here
      ],
      warnings: []
    };
  }
}
```

Then modify `service.ts` to use the mock adapter:
```typescript
// In CveSearchService constructor
this.nvdAdapter = new MockNvdAdapter(context); // Instead of NvdAdapter
```

### **Option 2: Environment-Based Mocking**

Add an environment variable to toggle between real and mock data:

```typescript
// In service.ts
if (process.env.USE_MOCK_CVE_DATA === "true") {
  this.nvdAdapter = new MockNvdAdapter(context);
} else {
  this.nvdAdapter = new NvdAdapter(context);
}
```

### **Option 3: Use the Database Service with Seeded Data**

1. Populate the database with your 20 dummy CVEs
2. Modify the service to use `CveDbService` instead of `NvdAdapter`
3. This gives you full control over the data

### **Option 4: API Route Override**

Create a separate API route for testing:

```typescript
// src/app/api/cves/search-mock/route.ts
export async function GET(request: Request) {
  return jsonResponse({
    data: [/* your 20 dummy CVEs */],
    meta: { query: "React", page: 1, pageSize: 20, tookMs: 10, sourcesUsed: ["Mock"], partial: false, warnings: [] }
  });
}
```

---

## Configuration & Environment Variables

### Current Configuration (`src/modules/cve-search/api/config.ts`):

```typescript
{
  nvdApiBaseUrl: "https://services.nvd.nist.gov/rest/json/cves/2.0",
  timeouts: {
    perSourceMs: 8000,      // 8 seconds per API call
    overallRequestMs: 12000 // 12 seconds total
  },
  retries: {
    maxRetries: 2,
    baseBackoffMs: 500
  },
  cacheTtlMs: {
    searchResults: 300000,  // 5 minutes
    cveById: 400000         // 6.67 minutes
  },
  circuitBreaker: {
    failureThreshold: 5,
    openMs: 30000           // 30 seconds
  }
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (CveSearchPageClient.tsx)                                      │
│  - Search input: "React"                                        │
│  - Filters: Severity, Year, KEV                                 │
│  - Pagination controls                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/cves/search?q=React&page=1
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API ROUTE LAYER                           │
│  (src/app/api/cves/search/route.ts)                            │
│  - Parse query parameters                                       │
│  - Call CveSearchService                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ service.search(query)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  (CveSearchService)                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Cache Check  │→ │ Fetch Data   │→ │ Process      │         │
│  │ (TTL: 5min)  │  │ from Sources │  │ & Rank       │         │
│  └──────────────┘  └──────┬───────┘  └──────────────┘         │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             │ nvdAdapter.search("React", options)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NVD ADAPTER LAYER                          │
│  (NvdAdapter)                                                   │
│  - Build NVD API URL with parameters                            │
│  - Make HTTP request with retry logic                           │
│  - Parse and normalize response                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP GET
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL NVD API                             │
│  https://services.nvd.nist.gov/rest/json/cves/2.0              │
│  - Official NIST vulnerability database                         │
│  - Returns REAL CVE data matching "React"                       │
│  - Response: 20 actual CVEs with React in description/CPE       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Findings

### ✅ **System is Working Correctly**
- The CVE searcher is functioning as designed
- It's querying the official NVD API
- Results are real, validated vulnerability data
- Caching and resilience mechanisms are in place

### 🔍 **Why "React" Returns Those Specific CVEs**
- NVD API searches CVE descriptions, CPE data, and metadata
- "React" matches:
  - React.js library vulnerabilities
  - ReactOS (operating system) vulnerabilities
  - React Native vulnerabilities
  - Any CVE mentioning "react" in description

### 📊 **Data Sources Available**
1. **NVD API** (currently active) - Live, real-time data
2. **Local Database** (available but not default) - Requires ingestion setup

### 🎯 **To Get Dummy Data**
You need to explicitly mock or override the data source, as the system is designed to fetch real vulnerability data from NVD.

---

## Recommendations

### For Testing/Development:
1. Create a `MockNvdAdapter` with your 20 dummy CVEs
2. Use environment variables to toggle between real and mock data
3. Consider using the database service with seeded test data

### For Production:
1. Keep using the NVD API for real-time data
2. Consider setting up the database ingestion for better performance
3. The database service supports EPSS and KEV enrichment

### For Understanding the Data:
1. The CVEs you listed are real vulnerabilities
2. They appear because they genuinely relate to "React" in some way
3. The NVD API is the authoritative source for CVE data

---

## Technical Specifications

### API Response Format:
```typescript
{
  data: NormalizedCve[],  // Array of CVE objects
  meta: {
    query: string,        // Search query
    page: number,         // Current page
    pageSize: number,     // Results per page
    tookMs: number,       // Response time
    sourcesUsed: string[], // ["NVD"] or ["Database"]
    partial: boolean,     // If any warnings occurred
    warnings: string[]    // Error/warning messages
  }
}
```

### NormalizedCve Object:
```typescript
{
  cveId: string,          // e.g., "CVE-2024-1234"
  title: string | null,
  description: string,
  published: string,      // ISO date
  lastModified: string,   // ISO date
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
  cvss: {
    version: string | null,
    baseScore: number | null,
    vector: string | null
  },
  epss: {
    score: number | null,
    percentile: number | null,
    asOf: string | null
  },
  kev: {
    isKnownExploited: boolean,
    dateAdded: string | null,
    dueDate: string | null,
    notes: string | null
  },
  affected: {
    cpe: string[],
    packages: string[]
  },
  references: Array<{ url: string, source?: string }>,
  sourceAttribution: Array<{ source: string, url?: string }>
}
```

---

## Verified Test Results

I tested your local application and confirmed:

```bash
curl "http://localhost:3000/api/cves/search?q=React&page=1&pageSize=20"
```

**Response metadata:**
```json
{
  "meta": {
    "tookMs": 1668,
    "sourcesUsed": ["NVD"],  // ← Confirms using NVD API
    "partial": false,
    "warnings": [],
    "query": "React",
    "page": 1,
    "pageSize": 20
  },
  "data": [
    {
      "cveId": "CVE-2007-1724",
      "description": "Unspecified vulnerability in ReactOS 0.3.1...",
      "severity": "CRITICAL",
      "cvss": { "version": "2.0", "baseScore": 10 },
      "sourceAttribution": [{"source": "NVD", "url": "https://nvd.nist.gov/vuln/detail/CVE-2007-1724"}]
    },
    // ... 19 more real CVEs
  ]
}
```

**Key findings:**
- ✅ `sourcesUsed: ["NVD"]` - Confirms live NVD API usage
- ✅ `sourceAttribution` includes NVD URLs
- ✅ All CVEs are real, documented vulnerabilities
- ✅ Your NVD API key is configured: `51190264-ba9f-4617-a5ff-e6efafd83fc5`

---

## Conclusion

Your CVE searcher is **not returning dummy data** - it's returning **real vulnerability data from the National Vulnerability Database**. The 20 CVEs you listed are legitimate security vulnerabilities that have been publicly disclosed. The system is working exactly as designed: it's a production-ready CVE search engine that queries live data from NIST's official API.

**Your system has TWO potential data sources:**
1. **NVD API** (currently active) - Live, real-time data from NIST
2. **PostgreSQL Database** (available but not used) - Has `Cve` table structure but service not activated

If you want to use dummy/mock data for testing or demonstration purposes, you'll need to implement one of the mocking strategies outlined in this report.

---

## Questions to Consider

1. **Do you want to use mock data for testing/demo purposes?**
   - If yes, I can help implement a mock adapter

2. **Do you want to set up the database ingestion for better performance?**
   - The database service is already implemented but needs data ingestion

3. **Are you experiencing issues with the NVD API?**
   - Rate limits, timeouts, or other problems?

4. **Do you want to understand why specific CVEs appear for certain searches?**
   - I can explain the NVD search algorithm and matching logic

---

**Report Generated:** February 8, 2026  
**System Status:** ✅ Operational - Fetching Real CVE Data from NVD API
