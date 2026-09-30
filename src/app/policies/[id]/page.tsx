"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/design-system/components/ui/breadcrumb";
import { Button } from "@repo/design-system/components/ui/button";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea as BoilerplateTextarea } from "@repo/design-system/components/ui/textarea";
import { ArrowLeft, Link2, Save, ScrollText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CompliancePill,
  type PolicyStatus,
  PolicyStatusPill,
  RelationshipPicker,
  RelationshipTable,
  RiskLevelPill,
  SummaryTile,
} from "@/components/grc/GrcPrimitives";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Pill, SectionCard } from "@/components/nis2/Nis2Primitives";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface PolicyDetail {
  allowedTransitions: PolicyStatus[];
  assets: { id: string; name: string; type: string }[];
  controls: {
    id: string;
    controlId: string;
    title: string;
    status: string;
    framework: string;
  }[];
  createdAt: string;
  data: {
    id: string;
    name: string;
    category: string;
    classification: string;
  }[];
  description: string | null;
  id: string;
  lastReview: string | null;
  nextReview: string | null;
  owner: string | null;
  reviewState: "UNSCHEDULED" | "CURRENT" | "DUE_SOON" | "OVERDUE";
  risks: {
    id: string;
    riskScore: number;
    isResolved: boolean;
    riskLevel: string;
    asset: { id: string; name: string };
    vulnerability: { id: string; title: string; cveId: string | null };
  }[];
  status: PolicyStatus;
  title: string;
  type: string | null;
  updatedAt: string;
  url: string | null;
  vendors: { id: string; name: string; criticality: string }[];
  version: string;
}

interface LinkDraft {
  assetIds: string[];
  controlIds: string[];
  dataAssetIds: string[];
  riskIds: string[];
  vendorIds: string[];
}

interface Candidates {
  assets: { id: string; label: string }[];
  controls: { id: string; label: string }[];
  data: { id: string; label: string }[];
  risks: { id: string; label: string }[];
  vendors: { id: string; label: string }[];
}

const POLICY_TYPES = ["POLICY", "STANDARD", "PROCEDURE", "GUIDELINE"];

const TRANSITION_LABELS: Record<string, string> = {
  DRAFT: "Keep as draft",
  UNDER_REVIEW: "Send for review",
  ACTIVE: "Approve",
  ARCHIVED: "Retire",
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const emptyCandidates: Candidates = {
  risks: [],
  assets: [],
  vendors: [],
  data: [],
  controls: [],
};

export default function PolicyDetailPage() {
  const params = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidates>(emptyCandidates);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<LinkDraft | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "POLICY",
    version: "1.0",
    owner: "",
    url: "",
    nextReview: "",
  });

  const load = useCallback(async () => {
    if (!params?.id) {
      return;
    }
    try {
      setError(null);
      const response = await fetch(`/api/policies/${params.id}`, {
        cache: "no-store",
      });
      if (response.status === 404) {
        throw new Error("Policy not found");
      }
      if (!response.ok) {
        throw new Error("Failed to load the policy");
      }
      const payload = await response.json();
      const detail: PolicyDetail = payload.data;
      setPolicy(detail);
      setForm({
        title: detail.title,
        description: detail.description ?? "",
        type: detail.type ?? "POLICY",
        version: detail.version,
        owner: detail.owner ?? "",
        url: detail.url ?? "",
        nextReview: detail.nextReview ? detail.nextReview.slice(0, 10) : "",
      });
      setDraft({
        riskIds: detail.risks.map((risk) => risk.id),
        assetIds: detail.assets.map((asset) => asset.id),
        vendorIds: detail.vendors.map((vendor) => vendor.id),
        dataAssetIds: detail.data.map((entry) => entry.id),
        controlIds: detail.controls.map((control) => control.id),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load the policy"
      );
    } finally {
      setIsLoading(false);
    }
  }, [params?.id]);

  const loadCandidates = useCallback(async () => {
    try {
      const [vendorsRes, assetsRes, dataRes, risksRes, complianceRes] =
        await Promise.all([
          fetch("/api/vendors", { cache: "no-store" }),
          fetch("/api/assets?limit=200", { cache: "no-store" }),
          fetch("/api/data-assets", { cache: "no-store" }),
          fetch("/api/risk-register?limit=200", { cache: "no-store" }),
          fetch("/api/compliance", { cache: "no-store" }),
        ]);

      const vendors = vendorsRes.ok
        ? ((await vendorsRes.json()).data ?? [])
        : [];
      const assets = assetsRes.ok ? ((await assetsRes.json()).data ?? []) : [];
      const data = dataRes.ok ? ((await dataRes.json()).data ?? []) : [];
      const risks = risksRes.ok ? ((await risksRes.json()).data ?? []) : [];
      const frameworks = complianceRes.ok
        ? ((await complianceRes.json()).data ?? [])
        : [];

      setCandidates({
        vendors: vendors.map((vendor: { id: string; name: string }) => ({
          id: vendor.id,
          label: vendor.name,
        })),
        assets: assets.map(
          (asset: { id: string; name: string; type: string }) => ({
            id: asset.id,
            label: `${asset.name} (${titleCase(asset.type)})`,
          })
        ),
        data: data.map((entry: { id: string; name: string }) => ({
          id: entry.id,
          label: entry.name,
        })),
        risks: risks.map(
          (risk: {
            id: string;
            threat: string;
            assetName: string;
            riskScore: number;
          }) => ({
            id: risk.id,
            label: `${risk.threat} — ${risk.assetName} (${risk.riskScore})`,
          })
        ),
        controls: frameworks.flatMap(
          (framework: {
            frameworkName: string;
            controls: { id: string; controlId: string; title: string }[];
          }) =>
            (framework.controls ?? []).map((control) => ({
              id: control.id,
              label: `${framework.frameworkName} · ${control.controlId} — ${control.title}`,
            }))
        ),
      });
    } catch {
      // Pickers degrade to showing only what is already linked.
    }
  }, []);

  useEffect(() => {
    void load();
    void loadCandidates();
  }, [load, loadCandidates]);

  const saveDetails = useCallback(async () => {
    if (!policy) {
      return;
    }
    setIsSaving(true);
    try {
      setError(null);
      setNotice(null);
      const response = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          type: form.type,
          version: form.version,
          owner: form.owner || null,
          url: form.url || null,
          nextReview: form.nextReview
            ? new Date(form.nextReview).toISOString()
            : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save the policy");
      }
      setNotice("Policy updated.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save the policy"
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, load, policy]);

  const saveLinks = useCallback(async () => {
    if (!(policy && draft)) {
      return;
    }
    setIsSaving(true);
    try {
      setError(null);
      setNotice(null);
      const response = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save the links");
      }
      setNotice("Connections saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save the links");
    } finally {
      setIsSaving(false);
    }
  }, [draft, load, policy]);

  const transition = useCallback(
    async (status: PolicyStatus) => {
      if (!policy) {
        return;
      }
      try {
        setError(null);
        setNotice(null);
        const response = await fetch(`/api/policies/${policy.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Status change failed");
        }
        setNotice(`Moved to ${titleCase(status.replace("_", " "))}.`);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status change failed");
      }
    },
    [load, policy]
  );

  const toggle = useCallback((key: keyof LinkDraft, id: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: current[key].includes(id)
              ? current[key].filter((entry) => entry !== id)
              : [...current[key], id],
          }
        : current
    );
  }, []);

  const summaries = useMemo(() => {
    if (!policy) {
      return null;
    }
    const worstRisk = policy.risks.reduce(
      (max, risk) => Math.max(max, risk.riskScore),
      0
    );
    const openRisks = policy.risks.filter((risk) => !risk.isResolved).length;
    const compliantControls = policy.controls.filter(
      (control) => control.status === "COMPLIANT"
    ).length;
    return { worstRisk, openRisks, compliantControls };
  }, [policy]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !policy) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button asChild size="sm" variant="outline">
            <Link href="/policies">
              <ArrowLeft />
              Back to policies
            </Link>
          </Button>
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!(policy && draft && summaries)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/policies">Policies</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{policy.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button asChild size="sm" variant="outline">
            <Link href="/policies">
              <ArrowLeft />
              Back to policies
            </Link>
          </Button>
        </div>

        <PageHeader
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <PolicyStatusPill status={policy.status} />
              {policy.allowedTransitions.map((target) => (
                <button
                  className="rounded-xl border border-[var(--border-color)] px-3 py-2 font-semibold text-[var(--text-secondary)] text-sm transition-colors hover:border-blue-500/40 hover:text-blue-500"
                  key={target}
                  onClick={() => void transition(target)}
                  type="button"
                >
                  {TRANSITION_LABELS[target] ??
                    titleCase(target.replace("_", " "))}
                </button>
              ))}
            </div>
          }
          badge={
            <>
              <ScrollText size={13} />
              {policy.type ?? "POLICY"} · v{policy.version}
            </>
          }
          description={
            policy.description ||
            `${policy.type ?? "POLICY"} · v${policy.version}`
          }
          stats={[
            {
              label: "Applies to",
              value:
                policy.risks.length +
                policy.assets.length +
                policy.vendors.length +
                policy.data.length +
                policy.controls.length,
              trend: { value: "Linked records", neutral: true },
              icon: Link2,
            },
            {
              label: "Open risks",
              value: summaries.openRisks,
              trend: {
                value: `worst score ${summaries.worstRisk}`,
                neutral: true,
              },
              icon: ShieldCheck,
            },
            {
              label: "Controls",
              value: policy.controls.length,
              trend: {
                value: `${summaries.compliantControls} compliant`,
                neutral: true,
              },
              icon: ShieldCheck,
            },
            {
              label: "Review",
              value: titleCase(policy.reviewState.replace("_", " ")),
              trend: {
                value: policy.nextReview
                  ? `by ${new Date(policy.nextReview).toLocaleDateString()}`
                  : "unscheduled",
                neutral: true,
              },
              icon: ScrollText,
            },
          ]}
          title={policy.title}
        />

        {(error || notice) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400"
                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {error ?? notice}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <SummaryTile
            hint={`${summaries.openRisks} open`}
            label="Risks"
            value={policy.risks.length}
          />
          <SummaryTile
            hint="Governed assets"
            label="Assets"
            value={policy.assets.length}
          />
          <SummaryTile
            hint="Governed suppliers"
            label="Vendors"
            value={policy.vendors.length}
          />
          <SummaryTile
            hint="Governed data types"
            label="Data"
            value={policy.data.length}
          />
          <SummaryTile
            hint="Mapped control objectives"
            label="Controls"
            value={policy.controls.length}
          >
            <CompliancePill
              status={
                summaries.compliantControls === policy.controls.length &&
                policy.controls.length > 0
                  ? "COMPLIANT"
                  : summaries.compliantControls > 0
                    ? "PARTIALLY_COMPLIANT"
                    : "NOT_ASSESSED"
              }
            />
          </SummaryTile>
        </div>

        {/* Details */}
        <SectionCard
          actions={
            <button
              className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveDetails()}
              type="button"
            >
              <Save size={14} />
              {isSaving ? "Saving…" : "Save"}
            </button>
          }
          description="Ownership, version and review dates for this document."
          title="Document"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Title
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                value={form.title}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Owner
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, owner: event.target.value })
                }
                value={form.owner}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Type
              </span>
              <Select
                onValueChange={(event) => setForm({ ...form, type: event })}
                value={form.type}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {POLICY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Version
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, version: event.target.value })
                }
                value={form.version}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Document URL
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, url: event.target.value })
                }
                placeholder="https://…"
                value={form.url}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Next review
              </span>
              <DatePickerField
                label="Choose next review date"
                onChange={(nextReview) => setForm({ ...form, nextReview })}
                value={form.nextReview}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Description
            </span>
            <BoilerplateTextarea
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={5}
              value={form.description}
            />
          </label>

          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            Last review:{" "}
            {policy.lastReview
              ? new Date(policy.lastReview).toLocaleDateString()
              : "never"}{" "}
            · Updated {new Date(policy.updatedAt).toLocaleDateString()}
          </p>
        </SectionCard>

        {/* Connected records */}
        <SectionCard
          actions={
            <button
              className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void saveLinks()}
              type="button"
            >
              <Save size={14} />
              Save connections
            </button>
          }
          description="What this policy governs: risks → assets → vendors → data → controls."
          title="Connections"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <RelationshipPicker
              onToggle={(id) => toggle("riskIds", id)}
              options={candidates.risks}
              selected={draft.riskIds}
              title="Risks"
            />
            <RelationshipPicker
              onToggle={(id) => toggle("assetIds", id)}
              options={candidates.assets}
              selected={draft.assetIds}
              title="Assets"
            />
            <RelationshipPicker
              onToggle={(id) => toggle("vendorIds", id)}
              options={candidates.vendors}
              selected={draft.vendorIds}
              title="Vendors"
            />
            <RelationshipPicker
              onToggle={(id) => toggle("dataAssetIds", id)}
              options={candidates.data}
              selected={draft.dataAssetIds}
              title="Data"
            />
            <RelationshipPicker
              className="lg:col-span-2"
              onToggle={(id) => toggle("controlIds", id)}
              options={candidates.controls}
              selected={draft.controlIds}
              title="Controls"
            />
          </div>
        </SectionCard>

        {/* Linked risks */}
        <SectionCard
          description="Risks this policy is cited against."
          title="Linked risks"
        >
          <RelationshipTable
            columns={[
              {
                key: "threat",
                label: "Risk",
                render: (risk) => (
                  <div className="min-w-[220px]">
                    <span className="font-medium text-[var(--text-primary)]">
                      {risk.vulnerability.title}
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {risk.vulnerability.cveId ?? "No CVE"} · {risk.asset.name}
                    </p>
                  </div>
                ),
              },
              {
                key: "score",
                label: "Score",
                align: "right",
                render: (risk) => (
                  <span className="font-bold font-mono text-[var(--text-primary)]">
                    {risk.riskScore}
                  </span>
                ),
              },
              {
                key: "level",
                label: "Level",
                render: (risk) => <RiskLevelPill level={risk.riskLevel} />,
              },
              {
                key: "state",
                label: "State",
                render: (risk) =>
                  risk.isResolved ? (
                    <Pill tone="success">Resolved</Pill>
                  ) : (
                    <Pill tone="danger">Open</Pill>
                  ),
              },
            ]}
            emptyMessage="No risks linked yet — pick them in Connections above."
            keyOf={(risk) => risk.id}
            rows={policy.risks}
          />
        </SectionCard>

        {/* Linked controls */}
        <SectionCard
          description="Control objectives this policy implements."
          title="Mapped controls"
        >
          <RelationshipTable
            columns={[
              {
                key: "control",
                label: "Control",
                render: (control) => (
                  <div>
                    <span className="font-bold font-mono text-intent-accent text-xs">
                      {control.controlId}
                    </span>
                    <span className="ml-2 font-medium text-[var(--text-primary)]">
                      {control.title}
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {control.framework}
                    </p>
                  </div>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (control) => <CompliancePill status={control.status} />,
              },
            ]}
            emptyMessage="No controls mapped yet — pick them in Connections above."
            keyOf={(control) => control.id}
            rows={policy.controls}
          />
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
