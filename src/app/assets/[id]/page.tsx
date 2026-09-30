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
import {
  ArrowLeft,
  Building2,
  Database,
  FileCheck,
  Save,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppetitePill,
  CompliancePill,
  type PickerOption,
  PolicyStatusPill,
  RelationshipPicker,
  RelationshipTable,
  RiskLevelPill,
  SummaryTile,
} from "@/components/grc/GrcPrimitives";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Pill, SectionCard } from "@/components/nis2/Nis2Primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface AssetRisk {
  aiAnalysis: { threat?: string } | null;
  appetiteStatus: string;
  appetiteTolerance: number | null;
  id: string;
  isResolved: boolean;
  riskLevel: string;
  riskScore: number;
  vulnerability: { title: string; cveId: string | null };
}

interface AssetOverview {
  appetite: {
    status: string;
    within: number;
    approaching: number;
    exceeded: number;
    notEvaluated: number;
  };
  asset: {
    id: string;
    name: string;
    type: string;
    hostname: string | null;
    ipAddress: string | null;
    environment: string;
    criticality: string;
    status: string;
    owner: string | null;
    department: string | null;
    location: string | null;
    createdAt: string;
  };
  compliance: { status: string; assessed: number };
  controls: {
    id: string;
    controlId: string;
    title: string;
    framework: string;
    status: string;
    via: string;
    assessedAt: string | null;
  }[];
  data: {
    id: string;
    name: string;
    category: string;
    classification: string;
    dataRole: string;
  }[];
  policies: {
    id: string;
    title: string;
    status: string;
    type: string | null;
    version: string;
    owner: string | null;
    nextReview: string | null;
  }[];
  risks: AssetRisk[];
  summary: {
    vendorCount: number;
    dataCount: number;
    riskCount: number;
    openRiskCount: number;
    maxRiskScore: number;
    riskLevel: string;
    policyCount: number;
    controlCount: number;
    appetiteStatus: string;
    complianceStatus: string;
  };
  vendors: {
    id: string;
    name: string;
    criticality: string;
    serviceProvided: string;
    securityScore: number | null;
    relationshipType: string;
  }[];
}

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const VENDOR_RELATIONSHIP_OPTIONS = [
  { value: "PROVIDES", label: "Provides" },
  { value: "MANAGES", label: "Manages" },
  { value: "HOSTS", label: "Hosts" },
  { value: "OPERATES", label: "Operates" },
  { value: "SUPPORTS", label: "Supports" },
];

const DATA_ROLE_OPTIONS = [
  { value: "STORES", label: "Stores" },
  { value: "PROCESSES", label: "Processes" },
  { value: "TRANSITS", label: "Transits" },
];

export default function AssetOverviewPage() {
  const params = useParams<{ id: string }>();
  const [overview, setOverview] = useState<AssetOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [vendorOptions, setVendorOptions] = useState<PickerOption[]>([]);
  const [dataOptions, setDataOptions] = useState<PickerOption[]>([]);
  const [vendorSelection, setVendorSelection] = useState<
    Record<string, string>
  >({});
  const [dataSelection, setDataSelection] = useState<Record<string, string>>(
    {}
  );

  const load = useCallback(async () => {
    if (!params?.id) {
      return;
    }
    try {
      setError(null);
      const response = await fetch(`/api/assets/${params.id}/overview`, {
        cache: "no-store",
      });
      if (response.status === 404) {
        throw new Error("Asset not found");
      }
      if (!response.ok) {
        throw new Error("Failed to load the asset overview");
      }
      const payload = await response.json();
      setOverview(payload.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load the asset overview"
      );
    } finally {
      setIsLoading(false);
    }
  }, [params?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Candidates for the connection editors, merged with what is linked already.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [vendorsRes, dataRes] = await Promise.all([
        fetch("/api/vendors", { cache: "no-store" }),
        fetch("/api/data-assets", { cache: "no-store" }),
      ]);
      if (cancelled) {
        return;
      }
      const vendors: { id: string; name: string }[] = vendorsRes.ok
        ? ((await vendorsRes.json()).data ?? [])
        : [];
      const data: { id: string; name: string }[] = dataRes.ok
        ? ((await dataRes.json()).data ?? [])
        : [];
      if (cancelled) {
        return;
      }
      setVendorOptions(
        vendors.map((vendor) => ({ id: vendor.id, label: vendor.name }))
      );
      setDataOptions(
        data.map((entry) => ({ id: entry.id, label: entry.name }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!overview) {
      return;
    }
    setVendorSelection(
      Object.fromEntries(
        overview.vendors.map((vendor) => [vendor.id, vendor.relationshipType])
      )
    );
    setDataSelection(
      Object.fromEntries(
        overview.data.map((entry) => [entry.id, entry.dataRole])
      )
    );
    setVendorOptions((current) => {
      const known = new Set(current.map((option) => option.id));
      const linked = overview.vendors
        .filter((vendor) => !known.has(vendor.id))
        .map((vendor) => ({ id: vendor.id, label: vendor.name }));
      return linked.length ? [...current, ...linked] : current;
    });
    setDataOptions((current) => {
      const known = new Set(current.map((option) => option.id));
      const linked = overview.data
        .filter((entry) => !known.has(entry.id))
        .map((entry) => ({ id: entry.id, label: entry.name }));
      return linked.length ? [...current, ...linked] : current;
    });
  }, [overview]);

  const toggleSelection = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    defaultValue: string,
    id: string
  ) => {
    setter((current) => {
      const next = { ...current };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = defaultValue;
      }
      return next;
    });
  };

  const saveConnections = useCallback(async () => {
    if (!overview) {
      return;
    }
    setIsSavingLinks(true);
    try {
      setError(null);
      setLinkNotice(null);
      const response = await fetch(
        `/api/assets/${overview.asset.id}/relationships`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vendors: Object.entries(vendorSelection).map(
              ([vendorId, relationshipType]) => ({ vendorId, relationshipType })
            ),
            data: Object.entries(dataSelection).map(
              ([dataAssetId, dataRole]) => ({
                dataAssetId,
                dataRole,
              })
            ),
          }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save the connections");
      }
      setLinkNotice("Connections saved.");
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save the connections"
      );
    } finally {
      setIsSavingLinks(false);
    }
  }, [dataSelection, load, overview, vendorSelection]);

  const sortedRisks = useMemo(
    () =>
      overview
        ? [...overview.risks].sort((a, b) => b.riskScore - a.riskScore)
        : [],
    [overview]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !overview) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Button asChild size="sm" variant="outline">
            <Link href="/assets">
              <ArrowLeft />
              Back to assets
            </Link>
          </Button>
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error ?? "Asset not found"}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { asset, summary, appetite } = overview;

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
                  <Link href="/assets">Assets</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{asset.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button asChild size="sm" variant="outline">
            <Link href="/assets">
              <ArrowLeft />
              Back to assets
            </Link>
          </Button>
        </div>

        <PageHeader
          badge={
            <>
              <Server size={13} />
              {titleCase(asset.type)} · {titleCase(asset.criticality)}{" "}
              criticality
            </>
          }
          description={
            [asset.hostname, asset.ipAddress, asset.owner, asset.department]
              .filter(Boolean)
              .join(" · ") ||
            `${titleCase(asset.type)} in ${titleCase(asset.environment)}`
          }
          stats={[
            {
              label: "Risk level",
              value: summary.riskLevel,
              trend: { value: `score ${summary.maxRiskScore}`, neutral: true },
              icon: ShieldAlert,
            },
            {
              label: "Appetite",
              value: summary.appetiteStatus.replace("_", " ").toLowerCase(),
              trend: {
                value: `${appetite.exceeded} over tolerance`,
                neutral: true,
              },
              icon: ShieldCheck,
            },
            {
              label: "Compliance",
              value: titleCase(summary.complianceStatus.replace("_", " ")),
              trend: {
                value: `${overview.compliance.assessed} controls assessed`,
                neutral: true,
              },
              icon: FileCheck,
            },
            {
              label: "Vendors",
              value: summary.vendorCount,
              trend: { value: "Touching this asset", neutral: true },
              icon: Building2,
            },
            {
              label: "Data types",
              value: summary.dataCount,
              trend: { value: "Stored, processed, transiting", neutral: true },
              icon: Database,
            },
          ]}
          title={asset.name}
        />

        <div className="flex flex-wrap gap-3">
          <SummaryTile
            hint="Suppliers touching this asset"
            label="Vendors"
            value={summary.vendorCount}
          />
          <SummaryTile
            hint="Stored, processed or transiting"
            label="Data"
            value={summary.dataCount}
          />
          <SummaryTile
            hint={`${summary.riskCount} total`}
            label="Open risks"
            value={summary.openRiskCount}
          />
          <SummaryTile
            hint="Applying to this asset"
            label="Policies"
            value={summary.policyCount}
          />
          <SummaryTile
            hint="Assessed on this asset"
            label="Controls"
            value={summary.controlCount}
          >
            <CompliancePill status={summary.complianceStatus} />
          </SummaryTile>
          <SummaryTile
            label="Appetite"
            value={<AppetitePill status={summary.appetiteStatus} />}
          >
            <RiskLevelPill level={summary.riskLevel} />
          </SummaryTile>
        </div>

        {/* Vendors — the reverse of the vendor overview */}
        <SectionCard
          actions={
            <Link
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-1.5 font-semibold text-[var(--text-secondary)] text-xs hover:border-blue-500/40 hover:text-blue-500"
              href="/vendors"
            >
              <Building2 size={13} />
              All vendors
            </Link>
          }
          description="Suppliers that provide, manage, host, operate or support this asset."
          title="Vendors"
        >
          <RelationshipTable
            columns={[
              {
                key: "name",
                label: "Vendor",
                render: (vendor) => (
                  <div>
                    <Link
                      className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                      href={`/vendors/${vendor.id}`}
                    >
                      {vendor.name}
                    </Link>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {vendor.serviceProvided}
                    </p>
                  </div>
                ),
              },
              {
                key: "criticality",
                label: "Criticality",
                render: (vendor) =>
                  titleCase(vendor.criticality.replace("_", " ")),
              },
              {
                key: "relationship",
                label: "Relationship",
                render: (vendor) => (
                  <Pill tone="info">{titleCase(vendor.relationshipType)}</Pill>
                ),
              },
              {
                key: "score",
                label: "Security score",
                align: "right",
                render: (vendor) =>
                  vendor.securityScore != null
                    ? `${vendor.securityScore}/100`
                    : "—",
              },
            ]}
            emptyMessage="No vendors linked to this asset yet."
            keyOf={(vendor) => vendor.id}
            rows={overview.vendors}
          />
        </SectionCard>

        {/* Data handled by this asset */}
        <SectionCard
          description="What this asset stores, processes or transits."
          title="Data handled"
        >
          <RelationshipTable
            columns={[
              {
                key: "name",
                label: "Data type",
                render: (entry) => (
                  <div>
                    <Link
                      className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                      href={`/data?highlight=${entry.id}`}
                    >
                      {entry.name}
                    </Link>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {titleCase(entry.category)}
                    </p>
                  </div>
                ),
              },
              {
                key: "classification",
                label: "Classification",
                render: (entry) => (
                  <Pill
                    tone={
                      entry.classification === "RESTRICTED"
                        ? "danger"
                        : entry.classification === "CONFIDENTIAL"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {titleCase(entry.classification)}
                  </Pill>
                ),
              },
              {
                key: "role",
                label: "Asset role",
                render: (entry) => (
                  <Pill tone="neutral">{titleCase(entry.dataRole)}</Pill>
                ),
              },
            ]}
            emptyMessage="No data types linked to this asset yet."
            keyOf={(entry) => entry.id}
            rows={overview.data}
          />
        </SectionCard>

        {/* Editable connections — the reverse relationship */}
        <SectionCard
          actions={
            <div className="flex items-center gap-2">
              {linkNotice && (
                <span className="text-emerald-600 text-xs dark:text-emerald-400">
                  {linkNotice}
                </span>
              )}
              <button
                className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm disabled:opacity-60"
                disabled={isSavingLinks}
                onClick={() => void saveConnections()}
                type="button"
              >
                <Save size={14} />
                {isSavingLinks ? "Saving…" : "Save connections"}
              </button>
            </div>
          }
          description="Link the vendors that touch this asset, and the data it stores, processes or transits."
          title="Edit connections"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <RelationshipPicker
              meta={vendorSelection}
              metaLabel="Relationship"
              metaOptions={VENDOR_RELATIONSHIP_OPTIONS}
              onMetaChange={(id, value) =>
                setVendorSelection((current) => ({ ...current, [id]: value }))
              }
              onToggle={(id) =>
                toggleSelection(setVendorSelection, "MANAGES", id)
              }
              options={vendorOptions}
              selected={Object.keys(vendorSelection)}
              title="Vendors"
            />
            <RelationshipPicker
              meta={dataSelection}
              metaLabel="Role"
              metaOptions={DATA_ROLE_OPTIONS}
              onMetaChange={(id, value) =>
                setDataSelection((current) => ({ ...current, [id]: value }))
              }
              onToggle={(id) => toggleSelection(setDataSelection, "STORES", id)}
              options={dataOptions}
              selected={Object.keys(dataSelection)}
              title="Data"
            />
          </div>
        </SectionCard>

        {/* Risks */}
        <SectionCard
          actions={
            <Link
              className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 font-semibold text-[var(--text-secondary)] text-xs hover:border-blue-500/40 hover:text-blue-500"
              href="/risk-register"
            >
              Risk register
            </Link>
          }
          description="Every risk raised against this asset, evaluated against its appetite statement."
          title="Risks"
        >
          <RelationshipTable
            columns={[
              {
                key: "threat",
                label: "Risk",
                render: (risk) => (
                  <div className="min-w-[220px]">
                    <span className="font-medium text-[var(--text-primary)]">
                      {risk.aiAnalysis?.threat || risk.vulnerability.title}
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {risk.vulnerability.cveId ?? risk.vulnerability.title}
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
                key: "appetite",
                label: "Appetite",
                render: (risk) => (
                  <AppetitePill
                    status={risk.appetiteStatus}
                    tolerance={risk.appetiteTolerance}
                  />
                ),
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
            emptyMessage="No risks recorded for this asset."
            keyOf={(risk) => risk.id}
            rows={sortedRisks}
          />
        </SectionCard>

        {/* Policies and controls */}
        <SectionCard
          description="Documents and control objectives that govern this asset."
          title="Policies & controls"
        >
          <div className="space-y-5">
            <div>
              <h3 className="mb-2 font-bold text-[var(--text-muted)] text-xs uppercase tracking-widest">
                Policies
              </h3>
              <RelationshipTable
                columns={[
                  {
                    key: "title",
                    label: "Policy",
                    render: (policy) => (
                      <div>
                        <Link
                          className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                          href={`/policies/${policy.id}`}
                        >
                          {policy.title}
                        </Link>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {policy.type ?? "POLICY"} · v{policy.version}
                          {policy.owner ? ` · ${policy.owner}` : ""}
                        </p>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (policy) => (
                      <PolicyStatusPill status={policy.status} />
                    ),
                  },
                  {
                    key: "review",
                    label: "Next review",
                    render: (policy) =>
                      policy.nextReview
                        ? new Date(policy.nextReview).toLocaleDateString()
                        : "Unscheduled",
                  },
                ]}
                emptyMessage="No policies linked to this asset yet."
                keyOf={(policy) => policy.id}
                rows={overview.policies}
              />
            </div>

            <div>
              <h3 className="mb-2 font-bold text-[var(--text-muted)] text-xs uppercase tracking-widest">
                Controls
              </h3>
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
                    render: (control) => (
                      <CompliancePill status={control.status} />
                    ),
                  },
                  {
                    key: "via",
                    label: "Reached via",
                    render: (control) => (
                      <Pill tone="neutral">{titleCase(control.via)}</Pill>
                    ),
                  },
                  {
                    key: "assessed",
                    label: "Assessed",
                    render: (control) =>
                      control.assessedAt
                        ? new Date(control.assessedAt).toLocaleDateString()
                        : "—",
                  },
                ]}
                emptyMessage="No controls assessed on this asset yet."
                keyOf={(control) => control.id}
                rows={overview.controls}
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
