import { logEvent } from "@/modules/cve-search/api/log";
import { getCveSearchService } from "@/modules/cve-search/api/service";
import { requireApiAuth } from "@/lib/security/api-auth";
import {
  badRequest,
  internalServerError,
  jsonResponse,
  parseSearchQueryFromUrl,
  toRequestErrorMessage,
} from "@/modules/cve-search/api/route-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function handleSearch(request: Request) {
  const authResult = await requireApiAuth({ request });
  if ("response" in authResult) {
    return authResult.response;
  }

  const requestId = crypto.randomUUID();

  try {
    const query = parseSearchQueryFromUrl(request.url);
    const service = getCveSearchService();
    const result = await service.search(query);

    return jsonResponse(result);
  } catch (error) {
    const normalized = toRequestErrorMessage(error);

    if (normalized.issues) {
      return badRequest(normalized.message, normalized.issues);
    }

    logEvent("error", "search_route_failed", {
      requestId,
      message: normalized.message,
    });

    return internalServerError(requestId);
  }
}

export async function GET(request: Request) {
  return handleSearch(request);
}

export async function POST(request: Request) {
  return handleSearch(request);
}
