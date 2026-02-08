import { logEvent } from "@/modules/cve-search/api/log";
import { getCveSearchService } from "@/modules/cve-search/api/service";
import {
  badRequest,
  internalServerError,
  jsonResponse,
  notFound,
  parseCveId,
  toRequestErrorMessage,
} from "@/modules/cve-search/api/route-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ cveId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID();

  try {
    const params = await context.params;
    const cveId = parseCveId(params.cveId);

    const service = getCveSearchService();
    const result = await service.getById(cveId);

    if (!result) {
      return notFound(`CVE ${cveId} was not found`);
    }

    return jsonResponse(result);
  } catch (error) {
    const normalized = toRequestErrorMessage(error);

    if (normalized.issues) {
      return badRequest(normalized.message, normalized.issues);
    }

    logEvent("error", "detail_route_failed", {
      requestId,
      message: normalized.message,
    });

    return internalServerError(requestId);
  }
}
