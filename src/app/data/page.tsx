"use client";
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
import { Building2, Database, FileCheck, Plus, Server } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RelationshipTable } from "@/components/grc/GrcPrimitives";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  EmptyState,
  Pill,
  SectionCard,
} from "@/components/nis2/Nis2Primitives";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface DataAssetRow {
  category: string;
  classification: string;
  counts: { vendors: number; assets: number; policies: number };
  description: string | null;
  id: string;
  name: string;
  retentionNotes: string | null;
  tags: string[];
}

interface DataAssetDetail extends DataAssetRow {
  assets: {
    id: string;
    name: string;
    type: string;
    criticality: string;
    dataRole: string;
  }[];
  policies: {
    id: string;
    title: string;
    status: string;
    type: string | null;
  }[];
  vendors: {
    id: string;
    name: string;
    criticality: string;
    accessType: string;
  }[];
}

const DATA_CATEGORIES = [
  "CUSTOMER_PII",
  "EMPLOYEE_DATA",
  "FINANCIAL_DATA",
  "AUTHENTICATION_CREDENTIALS",
  "BUSINESS_SENSITIVE",
  "HEALTH_DATA",
  "TELEMETRY",
  "OTHER",
];

const DATA_CLASSIFICATIONS = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
];

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const emptyForm = {
  name: "",
  category: "BUSINESS_SENSITIVE",
  classification: "INTERNAL",
  description: "",
  retentionNotes: "",
};

export default function DataCatalogPage() {
  // Read after mount rather than with useSearchParams, so the page still
  // prerenders without a Suspense boundary.
  const [highlight, setHighlight] = useState<string | null>(null);

  const [items, setItems] = useState<DataAssetRow[]>([]);
  const [detail, setDetail] = useState<DataAssetDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/data-assets", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load the data catalog");
      }
      const payload = await response.json();
      setItems(payload.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load the data catalog"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/data-assets/${id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json();
      setDetail(payload.data);
    } catch {
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    void load();
    setHighlight(new URLSearchParams(window.location.search).get("highlight"));
  }, [load]);

  useEffect(() => {
    if (highlight && items.length > 0) {
      void loadDetail(highlight);
    }
  }, [highlight, items.length, loadDetail]);

  const createDataAsset = useCallback(async () => {
    setIsSaving(true);
    try {
      setError(null);
      const response = await fetch("/api/data-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: form.description || null,
          retentionNotes: form.retentionNotes || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to add the data record");
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add the data record"
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, load]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  const totals = items.reduce(
    (acc, item) => ({
      vendors: acc.vendors + item.counts.vendors,
      assets: acc.assets + item.counts.assets,
      policies: acc.policies + item.counts.policies,
    }),
    { vendors: 0, assets: 0, policies: 0 }
  );

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          actions={
            <button
              className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => setIsModalOpen(true)}
              type="button"
            >
              <Plus size={14} />
              Add data record
            </button>
          }
          badge={
            <>
              <Database size={13} />
              Data · Vendors · Assets · Policies
            </>
          }
          description="Every data type the organization handles, shared by the vendors and assets that touch it — recorded once, linked everywhere."
          stats={[
            {
              label: "Data records",
              value: items.length,
              trend: { value: "In the catalog", neutral: true },
              icon: Database,
            },
            {
              label: "Vendor links",
              value: totals.vendors,
              trend: { value: "Collected or accessed", neutral: true },
              icon: Building2,
            },
            {
              label: "Asset links",
              value: totals.assets,
              trend: { value: "Stored or processed", neutral: true },
              icon: Server,
            },
            {
              label: "Policy links",
              value: totals.policies,
              trend: { value: "Governed documents", neutral: true },
              icon: FileCheck,
            },
          ]}
          title="Data Catalog"
        />

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        )}

        <SectionCard
          description="Select a record to see which vendors, assets and policies connect to it."
          title="Data records"
        >
          {items.length === 0 ? (
            <EmptyState message="No data records yet. Add the data types your organization handles — customer PII, financial data, credentials — and link them to vendors and assets." />
          ) : (
            <RelationshipTable<DataAssetRow>
              columns={[
                {
                  key: "name",
                  label: "Data type",
                  render: (item) => (
                    <button
                      className="text-left"
                      onClick={() => void loadDetail(item.id)}
                      type="button"
                    >
                      <span className="font-semibold text-[var(--text-primary)] hover:text-blue-500">
                        {item.name}
                      </span>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {titleCase(item.category)}
                      </p>
                    </button>
                  ),
                },
                {
                  key: "classification",
                  label: "Classification",
                  render: (item) => (
                    <Pill
                      tone={
                        item.classification === "RESTRICTED"
                          ? "danger"
                          : item.classification === "CONFIDENTIAL"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {titleCase(item.classification)}
                    </Pill>
                  ),
                },
                {
                  key: "links",
                  label: "Connected",
                  render: (item) => (
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone="info">{item.counts.vendors} vendors</Pill>
                      <Pill tone="info">{item.counts.assets} assets</Pill>
                      <Pill tone="info">{item.counts.policies} policies</Pill>
                    </div>
                  ),
                },
                {
                  key: "retention",
                  label: "Retention",
                  render: (item) => (
                    <span className="text-[var(--text-muted)] text-xs">
                      {item.retentionNotes || "—"}
                    </span>
                  ),
                },
              ]}
              keyOf={(item) => item.id}
              rows={items}
            />
          )}
        </SectionCard>

        {detail && (
          <SectionCard
            actions={
              <button
                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 font-semibold text-[var(--text-secondary)] text-xs hover:bg-[var(--bg-tertiary)]"
                onClick={() => setDetail(null)}
                type="button"
              >
                Close
              </button>
            }
            description={
              detail.description ||
              `${titleCase(detail.category)} · ${titleCase(detail.classification)}`
            }
            title={detail.name}
          >
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 font-bold text-[var(--text-muted)] text-xs uppercase tracking-widest">
                  Vendors handling this data
                </h3>
                <RelationshipTable
                  columns={[
                    {
                      key: "name",
                      label: "Vendor",
                      render: (row) => (
                        <Link
                          className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                          href={`/vendors/${row.id}`}
                        >
                          {row.name}
                        </Link>
                      ),
                    },
                    {
                      key: "criticality",
                      label: "Criticality",
                      render: (row) =>
                        titleCase(row.criticality.replace("_", " ")),
                    },
                    {
                      key: "access",
                      label: "Access",
                      render: (row) => (
                        <Pill tone="warning">{titleCase(row.accessType)}</Pill>
                      ),
                    },
                  ]}
                  emptyMessage="No vendors handle this data yet."
                  keyOf={(row) => row.id}
                  rows={detail.vendors}
                />
              </div>

              <div>
                <h3 className="mb-2 font-bold text-[var(--text-muted)] text-xs uppercase tracking-widest">
                  Assets handling this data
                </h3>
                <RelationshipTable
                  columns={[
                    {
                      key: "name",
                      label: "Asset",
                      render: (row) => (
                        <Link
                          className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                          href={`/assets/${row.id}`}
                        >
                          {row.name}
                        </Link>
                      ),
                    },
                    {
                      key: "type",
                      label: "Type",
                      render: (row) => titleCase(row.type),
                    },
                    {
                      key: "role",
                      label: "Role",
                      render: (row) => (
                        <Pill tone="info">{titleCase(row.dataRole)}</Pill>
                      ),
                    },
                  ]}
                  emptyMessage="No assets handle this data yet."
                  keyOf={(row) => row.id}
                  rows={detail.assets}
                />
              </div>

              <div>
                <h3 className="mb-2 font-bold text-[var(--text-muted)] text-xs uppercase tracking-widest">
                  Governing policies
                </h3>
                <RelationshipTable
                  columns={[
                    {
                      key: "title",
                      label: "Policy",
                      render: (row) => (
                        <Link
                          className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                          href={`/policies/${row.id}`}
                        >
                          {row.title}
                        </Link>
                      ),
                    },
                    {
                      key: "type",
                      label: "Type",
                      render: (row) => row.type ?? "POLICY",
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (row) => <Pill tone="neutral">{row.status}</Pill>,
                    },
                  ]}
                  emptyMessage="No policies reference this data yet."
                  keyOf={(row) => row.id}
                  rows={detail.policies}
                />
              </div>
            </div>
          </SectionCard>
        )}
      </div>

      <Modal
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-[var(--border-color)] px-4 py-2 font-medium text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-tertiary)]"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn btn-primary rounded-xl px-4 py-2 font-semibold text-sm disabled:opacity-60"
              disabled={isSaving || form.name.trim().length < 2}
              onClick={() => void createDataAsset()}
              type="button"
            >
              {isSaving ? "Saving…" : "Add record"}
            </button>
          </div>
        }
        isOpen={isModalOpen}
        maxWidth="lg"
        onClose={() => setIsModalOpen(false)}
        title="Add a data record"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Name
            </span>
            <BoilerplateInput
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Customer PII, Payment records…"
              value={form.name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Category
              </span>
              <Select
                onValueChange={(event) => setForm({ ...form, category: event })}
                value={form.category}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DATA_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {titleCase(category)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Classification
              </span>
              <Select
                onValueChange={(event) =>
                  setForm({ ...form, classification: event })
                }
                value={form.classification}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {DATA_CLASSIFICATIONS.map((classification) => (
                      <SelectItem key={classification} value={classification}>
                        {classification}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Description
            </span>
            <BoilerplateTextarea
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={3}
              value={form.description}
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Retention notes
            </span>
            <BoilerplateInput
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, retentionNotes: event.target.value })
              }
              placeholder="Retained 24 months, then anonymized"
              value={form.retentionNotes}
            />
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
