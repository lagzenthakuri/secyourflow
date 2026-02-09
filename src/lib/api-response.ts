import { NextResponse } from 'next/server';

interface CacheConfig {
  /**
   * Browser cache duration in seconds
   * 0 = no browser cache
   */
  maxAge?: number;
  
  /**
   * CDN/shared cache duration in seconds
   * Typically longer than maxAge
   */
  sMaxAge?: number;
  
  /**
   * Serve stale content while revalidating in background
   * Improves perceived performance
   */
  staleWhileRevalidate?: number;
  
  /**
   * Public (CDN cacheable) or private (user-specific)
   */
  visibility?: 'public' | 'private';
  
  /**
   * Must revalidate before serving stale content
   */
  mustRevalidate?: boolean;
}

/**
 * Creates a JSON response with proper caching headers
 */
export function cachedJsonResponse<T>(
  data: T,
  cache: CacheConfig,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  }
): Response {
  const {
    maxAge = 0,
    sMaxAge,
    staleWhileRevalidate,
    visibility = 'public',
    mustRevalidate = false
  } = cache;

  const cacheDirectives: string[] = [visibility];
  
  if (maxAge > 0) {
    cacheDirectives.push(`max-age=${maxAge}`);
  } else {
    cacheDirectives.push('no-cache');
  }
  
  if (sMaxAge !== undefined) {
    cacheDirectives.push(`s-maxage=${sMaxAge}`);
  }
  
  if (staleWhileRevalidate !== undefined) {
    cacheDirectives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }
  
  if (mustRevalidate) {
    cacheDirectives.push('must-revalidate');
  }

  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', cacheDirectives.join(', '));
  
  // Add ETag for conditional requests
  const etag = `"${hashCode(JSON.stringify(data))}"`;
  headers.set('ETag', etag);

  return new Response(JSON.stringify(data), {
    status: options?.status || 200,
    headers,
  });
}

/**
 * Creates an error response (never cached)
 */
export function errorResponse(
  message: string,
  options?: {
    status?: number;
    details?: Record<string, unknown>;
    code?: string;
  }
): Response {
  const body = {
    error: message,
    ...(options?.code && { code: options.code }),
    ...(options?.details && process.env.NODE_ENV === 'development' && { 
      details: options.details 
    }),
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(body), {
    status: options?.status || 500,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * Simple hash function for ETags
 */
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Predefined cache strategies for common use cases
 */
export const CACHE_STRATEGIES = {
  // Dashboard data: 5 min cache, serve stale for 10 min
  DASHBOARD: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 600,
    visibility: 'public' as const
  },
  
  // List data: 2 min cache, serve stale for 5 min
  LIST: {
    maxAge: 30,
    sMaxAge: 120,
    staleWhileRevalidate: 300,
    visibility: 'public' as const
  },
  
  // Detail data: 5 min cache, serve stale for 10 min
  DETAIL: {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 600,
    visibility: 'public' as const
  },
  
  // Real-time data: 30s cache, serve stale for 1 min
  REALTIME: {
    maxAge: 10,
    sMaxAge: 30,
    staleWhileRevalidate: 60,
    visibility: 'public' as const
  },
  
  // Reports: 30 min cache, serve stale for 1 hour
  REPORT: {
    maxAge: 300,
    sMaxAge: 1800,
    staleWhileRevalidate: 3600,
    visibility: 'public' as const
  },
  
  // User-specific: no shared cache
  PRIVATE: {
    maxAge: 60,
    visibility: 'private' as const,
    mustRevalidate: true
  },
  
  // No cache: always fresh
  NO_CACHE: {
    maxAge: 0,
    visibility: 'private' as const,
    mustRevalidate: true
  }
} as const;
