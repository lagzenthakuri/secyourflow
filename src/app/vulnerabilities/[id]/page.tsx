import { redirect } from "next/navigation";

/**
 * Deep link target for a single vulnerability.
 *
 * Notifications and remediation links have always pointed at
 * `/vulnerabilities/{id}`, but the route did not exist — every one of those
 * links produced a 404. The queue page already knows how to open a specific
 * finding via `?search=<id>`, so this resolves to that rather than duplicating
 * the whole view.
 */
export default async function VulnerabilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/vulnerabilities?search=${encodeURIComponent(id)}`);
}
