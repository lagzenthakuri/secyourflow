export interface FetchWithRetryOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
  baseBackoffMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

function computeBackoff(attempt: number, baseBackoffMs: number): number {
  const exp = baseBackoffMs * Math.pow(2, attempt);
  return Math.min(exp, 30_000);
}

export async function fetchWithRetry(options: FetchWithRetryOptions): Promise<Response> {
  const {
    url,
    method = "GET",
    headers,
    body,
    timeoutMs = 15_000,
    maxRetries = 2,
    baseBackoffMs = 500,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!shouldRetry(response.status) || attempt >= maxRetries) {
        return response;
      }

      await delay(computeBackoff(attempt, baseBackoffMs));
    } catch (error) {
      clearTimeout(timer);
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries) {
        break;
      }

      await delay(computeBackoff(attempt, baseBackoffMs));
    }
  }

  throw lastError ?? new Error(`Request failed for ${url}`);
}

export async function fetchJsonWithRetry<T>(options: FetchWithRetryOptions): Promise<T> {
  const response = await fetchWithRetry(options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${options.url}`);
  }

  return (await response.json()) as T;
}
