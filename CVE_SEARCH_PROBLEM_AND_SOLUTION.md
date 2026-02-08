# CVE Search Problem: False Positives in "React" Search

## The Problem

When searching for "React" in your CVE searcher, you're getting **irrelevant results** because the NVD API's `keywordSearch` parameter does **substring matching**. This means:

### ✅ Relevant Results (What You Want):
- CVE-2018-6342 - **react-dev-utils** vulnerability
- CVE-2019-12164 - **React Native** Desktop RCE
- CVE-2020-7787 - **react-adal** JWT validation issue
- CVE-2018-6341 - **React** applications XSS
- CVE-2020-7696 - **react-native-fast-image** credential leak
- CVE-2017-16028 - **react-native-meteor-oauth** weak RNG
- CVE-2020-1914 - Facebook **Hermes** (React Native engine)

### ❌ Irrelevant Results (False Positives):
- CVE-2007-1724 - **ReactOS** (operating system, NOT React.js)
- CVE-2007-4244 - "J! **Reactions**" (Joomla component)
- CVE-2019-11284 - "Pivotal **Reactor** Netty" (Spring framework)
- CVE-2020-5403 - "**Reactor** Netty HttpServer"
- CVE-2020-5404 - "**Reactor** Netty HttpClient"
- CVE-2017-7920 - "VSN300 WiFi Logger Card for **React**" (unclear)
- CVE-2021-3311 - "**reactivates** an old session" (verb)
- CVE-1999-0454 - "how it **reacts** to" (verb)

## Why This Happens

### 1. NVD API Keyword Search
The NVD API endpoint uses substring matching:
```
https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=React
```

This searches across:
- CVE descriptions
- CPE (Common Platform Enumeration) data
- Product names
- Vendor names

**Any occurrence of "react" (case-insensitive) triggers a match.**

### 2. Your Ranking System
The `rankCves()` function in `src/modules/cve-search/domain/ranking.ts` scores results but **doesn't filter out false positives**:

```typescript
function scoreText(value: string, query: string, tokens: string[], exactWeight: number, tokenWeight: number): number {
  const normalized = value.trim().toLowerCase();
  let score = normalized.includes(query) ? exactWeight : 0;  // ← Substring match
  // ...
}
```

This means:
- "React" gets a high score ✓
- "Reactor" also gets a high score ✗
- "Reactions" also gets a high score ✗
- "reactivates" also gets a high score ✗

## Solutions

### Solution 1: Word Boundary Matching (Recommended)

Modify the ranking system to use **word boundaries** instead of substring matching.

**File:** `src/modules/cve-search/domain/ranking.ts`

```typescript
function scoreText(value: string, query: string, tokens: string[], exactWeight: number, tokenWeight: number): number {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return 0;
  }

  // Use word boundary regex for exact word matching
  const queryRegex = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  let score = queryRegex.test(normalized) ? exactWeight : 0;
  
  for (const token of tokens) {
    const tokenRegex = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (tokenRegex.test(normalized)) {
      score += tokenWeight;
    }
  }

  return score;
}
```

**What this does:**
- `\b` = word boundary (matches start/end of words)
- "React" matches "React" ✓
- "React" does NOT match "Reactor" ✗
- "React" does NOT match "Reactions" ✗
- "React" does NOT match "reactivates" ✗

### Solution 2: Post-Filter Results

Add a filtering step after fetching from NVD to remove obvious false positives.

**File:** `src/modules/cve-search/api/service.ts`

Add this function:
```typescript
function filterRelevantResults(cves: NormalizedCve[], query: string): NormalizedCve[] {
  if (!query.trim()) return cves;
  
  const normalizedQuery = query.trim().toLowerCase();
  const queryRegex = new RegExp(`\\b${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  
  return cves.filter(cve => {
    // Check if query appears as a complete word in key fields
    const searchableText = [
      cve.cveId,
      cve.title || '',
      cve.description,
      ...cve.affected.cpe,
      ...cve.affected.packages.map(p => `${p.ecosystem} ${p.name}`)
    ].join(' ');
    
    return queryRegex.test(searchableText);
  });
}
```

Then in the `runCachedSearch` method, add filtering:
```typescript
const deduped = dedupeAndMergeCves(sourceCves);
const valid = validateNormalizedCves(deduped, warnings);
const relevant = filterRelevantResults(valid, query.q);  // ← Add this line
const filtered = applySearchFilters(relevant, query);
```

### Solution 3: Use Database with Full-Text Search

Switch to using the PostgreSQL database with proper full-text search capabilities.

**Advantages:**
- Much faster searches
- Better relevance ranking
- Support for stemming, synonyms, etc.
- Already has `searchVector` field in the `Cve` table

**File:** `src/modules/cve-search/api/service.ts`

Modify the constructor to use database:
```typescript
import { PrismaClient } from '@prisma/client';
import { CveDbService } from './db-service';

export class CveSearchService {
  private readonly dbService: CveDbService;
  
  constructor(config?: CveSearchConfig, fetchImpl?: typeof fetch) {
    this.config = config ?? getCveSearchConfig();
    
    // Use database instead of NVD API
    const prisma = new PrismaClient();
    this.dbService = new CveDbService(prisma);
    
    // Keep NVD adapter for fallback
    this.nvdAdapter = new NvdAdapter(context);
  }
  
  async search(query: SearchQuery): Promise<SearchResponse> {
    // Try database first
    try {
      return await this.dbService.search(query);
    } catch (error) {
      // Fallback to NVD API
      return this.runCachedSearch(query);
    }
  }
}
```

**Note:** This requires running the ingestion process to populate the database.

### Solution 4: Smarter Query Preprocessing

Detect common false positive patterns and adjust the query.

```typescript
function preprocessQuery(query: string): { query: string; excludePatterns: string[] } {
  const normalized = query.trim().toLowerCase();
  const excludePatterns: string[] = [];
  
  // If searching for "React", exclude common false positives
  if (normalized === 'react') {
    excludePatterns.push('reactor', 'reactos', 'reactions');
  }
  
  return { query, excludePatterns };
}

// Then filter results
function filterByExclusions(cves: NormalizedCve[], excludePatterns: string[]): NormalizedCve[] {
  if (excludePatterns.length === 0) return cves;
  
  return cves.filter(cve => {
    const text = `${cve.description} ${cve.affected.cpe.join(' ')}`.toLowerCase();
    return !excludePatterns.some(pattern => text.includes(pattern));
  });
}
```

## Recommended Implementation Plan

### Phase 1: Quick Fix (5 minutes)
Implement **Solution 1** (Word Boundary Matching) - this is the fastest way to improve results.

### Phase 2: Better Filtering (15 minutes)
Add **Solution 2** (Post-Filter Results) to remove remaining false positives.

### Phase 3: Long-term (1-2 hours)
Set up **Solution 3** (Database with Full-Text Search) for production-quality search.

## Testing the Fix

After implementing Solution 1 or 2, test with:

```bash
curl "http://localhost:3000/api/cves/search?q=React&page=1&pageSize=20"
```

**Expected results:**
- ✅ React.js vulnerabilities
- ✅ React Native vulnerabilities
- ✅ react-* npm packages
- ❌ NO ReactOS
- ❌ NO Reactor Netty
- ❌ NO "Reactions" or "reactivates"

## Code Changes Summary

### Minimal Fix (Solution 1):

**File:** `src/modules/cve-search/domain/ranking.ts`

Replace the `scoreText` function (lines ~60-75) with word boundary matching.

**Impact:**
- Improves relevance scoring
- Reduces false positives
- No breaking changes
- Works with existing NVD API

### Complete Fix (Solution 1 + 2):

1. Update `ranking.ts` with word boundary matching
2. Add `filterRelevantResults()` to `service.ts`
3. Call filter in the search pipeline

**Impact:**
- Significantly better search results
- Filters out most false positives
- Minimal performance impact
- Still uses NVD API

## Why This Matters

**Current behavior:**
- Search "React" → Get 20 results
- Only ~10-12 are actually React-related
- Users waste time reviewing irrelevant CVEs

**After fix:**
- Search "React" → Get 10-12 results
- All are React-related
- Better user experience
- More accurate vulnerability tracking

## Additional Considerations

### 1. CPE Matching
React.js CVEs often have CPE strings like:
```
cpe:2.3:a:facebook:react:*:*:*:*:*:*:*:*
cpe:2.3:a:facebook:react_native:*:*:*:*:*:*:*:*
```

You could add CPE-specific filtering:
```typescript
const isReactCpe = cve.affected.cpe.some(cpe => 
  cpe.includes(':facebook:react:') || 
  cpe.includes(':facebook:react_native:')
);
```

### 2. Vendor/Product Extraction
Parse CPE strings to extract vendor and product:
```typescript
// cpe:2.3:a:facebook:react:16.0.0:*:*:*:*:*:*:*
//         └─ vendor ─┘└product┘
```

### 3. User Feedback
Add a "Report Irrelevant" button to let users flag false positives.

### 4. Search Suggestions
Show "Did you mean?" suggestions:
- "React" → "React.js", "React Native", "ReactOS"
- Let users choose the specific product

## Conclusion

The root cause is **substring matching** in both the NVD API and your ranking system. The quickest fix is to implement **word boundary matching** in the `scoreText()` function. For production use, consider switching to the database service with proper full-text search.

**Estimated time to fix:**
- Quick fix (Solution 1): 5 minutes
- Better fix (Solution 1+2): 20 minutes
- Best fix (Solution 3): 1-2 hours (requires database setup)

Would you like me to implement one of these solutions?
