"use client";


import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@repo/design-system/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { DatePickerField } from "@/components/ui/DatePickerField";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn, formatLabel } from "@/lib/utils";
import { CheckCircle2, ClipboardCheck, Paperclip, Plus, RefreshCw, Search } from "lucide-react";
import { Alert, AlertDescription } from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/design-system/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@repo/design-system/components/ui/breadcrumb";

type RemediationStatus = "DRAFT" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "ARCHIVED";

interface RemediationPlanRecord {
  id: string;
  name: string;
  description?: string | null;
  status: RemediationStatus;
  dueDate?: string | null;
  createdAt: string;
  owner?: { id: string; name?: string | null; email?: string | null } | null;
  vulnerabilities: Array<{
    vulnerability: {
      id: string;
      title: string;
      severity: string;
      workflowState: string;
      slaDueAt?: string | null;
    };
  }>;
  _count?: {
    evidence?: number;
    notes?: number;
    vulnerabilities?: number;
  };
}

const statusOptions: RemediationStatus[] = [
  "DRAFT",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "ARCHIVED",
];

const statusTone: Record<RemediationStatus, string> = {
  DRAFT: "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  ACTIVE: "border-sky-400/35 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  BLOCKED: "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200",
  COMPLETED: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  ARCHIVED: "border-purple-400/35 bg-purple-500/10 text-purple-700 dark:text-purple-200",
};


function calculateProgress(plan: RemediationPlanRecord) {
  const total = plan.vulnerabilities.length;
  if (total === 0) {
    return 0;
  }
  const closed = plan.vulnerabilities.filter((item) =>
    ["RESOLVED", "CLOSED"].includes(item.vulnerability.workflowState),
  ).length;
  return Math.round((closed / total) * 100);
}

function toBase64Utf8(value: string) {
  if (!value) return "";
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export default function RemediationPlansPage() {
  const [plans, setPlans] = useState<RemediationPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RemediationPlanRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RemediationStatus | "ALL">("ALL");

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    status: "DRAFT" as RemediationStatus,
    vulnerabilityIds: "",
  });

  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    fileName: "",
    mimeType: "text/plain",
    notes: "",
    content: "",
  });

  const fetchPlans = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      const response = await fetch("/api/remediation-plans", { cache: "no-store" });
      const payload = (await response.json()) as { data?: RemediationPlanRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load remediation plans");
      }
      setPlans(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load remediation plans");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const handleCreate = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setFormError(null);

      const response = await fetch("/api/remediation-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || undefined,
          status: createForm.status,
          dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : undefined,
          vulnerabilityIds: createForm.vulnerabilityIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create remediation plan");
      }

      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        description: "",
        dueDate: "",
        status: "DRAFT",
        vulnerabilityIds: "",
      });
      await fetchPlans({ silent: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create remediation plan");
    } finally {
      setIsSubmitting(false);
    }
  }, [createForm, fetchPlans]);

  const updatePlanStatus = useCallback(
    async (id: string, status: RemediationStatus) => {
      try {
        setError(null);
        const response = await fetch(`/api/remediation-plans/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to update remediation plan");
        }

        await fetchPlans({ silent: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update remediation plan");
      }
    },
    [fetchPlans],
  );

  const submitEvidence = useCallback(async () => {
    if (!selectedPlan) return;

    try {
      setIsSubmitting(true);
      setFormError(null);

      const response = await fetch(`/api/remediation-plans/${selectedPlan.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: evidenceForm.title,
          fileName: evidenceForm.fileName || `${Date.now()}-evidence.txt`,
          mimeType: evidenceForm.mimeType,
          notes: evidenceForm.notes || undefined,
          contentBase64: evidenceForm.content ? toBase64Utf8(evidenceForm.content) : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to upload evidence");
      }

      setIsEvidenceOpen(false);
      setSelectedPlan(null);
      setEvidenceForm({
        title: "",
        fileName: "",
        mimeType: "text/plain",
        notes: "",
        content: "",
      });
      await fetchPlans({ silent: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to upload evidence");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPlan, evidenceForm, fetchPlans]);

  const summary = useMemo(() => {
    const completed = plans.filter((plan) => plan.status === "COMPLETED").length;
    const active = plans.filter((plan) => plan.status === "ACTIVE").length;
    const blocked = plans.filter((plan) => plan.status === "BLOCKED").length;
    return { completed, active, blocked };
  }, [plans]);

  const visiblePlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan) => {
      const matchesStatus = statusFilter === "ALL" || plan.status === statusFilter;
      const matchesQuery = !query || [
        plan.name,
        plan.description ?? "",
        plan.owner?.name ?? "",
        plan.owner?.email ?? "",
        ...plan.vulnerabilities.map(({ vulnerability }) => `${vulnerability.title} ${vulnerability.id}`),
      ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [plans, search, statusFilter]);

  if (isLoading && plans.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-screen-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link href="/dashboard">Dashboard</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink asChild><Link href="/vulnerabilities">Vulnerabilities</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Remediation plans</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <Button variant="outline" size="sm" asChild><Link href="/vulnerabilities"><ArrowLeft className="size-4" />Back to vulnerabilities</Link></Button>
        </div>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Vulnerability management</p>
            <h1 className="text-2xl font-semibold tracking-tight">Remediation plans</h1>
            <p className="text-sm text-muted-foreground">Coordinate fixes, owners, deadlines, and verification evidence.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void fetchPlans({ silent: true })} disabled={isRefreshing}>
              <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" onClick={() => { setFormError(null); setIsCreateOpen(true); }}>
              <Plus className="size-4" /> New plan
            </Button>
          </div>
        </header>

        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <section aria-label="Remediation plan summary" className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Active", value: summary.active, note: "In progress" },
            { label: "Blocked", value: summary.blocked, note: "Needs attention" },
            { label: "Completed", value: summary.completed, note: "Verified plans" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div><p className="text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.note}</p></div>
                <span className="text-2xl font-semibold tabular-nums">{item.value}</span>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <div><CardTitle>All plans</CardTitle><CardDescription>{plans.length} total · showing {visiblePlans.length}</CardDescription></div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative min-w-0 sm:w-72">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search remediation plans" placeholder="Search plans, owners, vulnerabilities" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RemediationStatus | "ALL")}>
                <SelectTrigger aria-label="Filter by status" className="sm:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent><SelectGroup><SelectItem value="ALL">All statuses</SelectItem>{statusOptions.map((status) => <SelectItem key={status} value={status}>{formatLabel(status)}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </div>
          </CardHeader>
          {plans.length === 0 ? (
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="grid size-11 place-items-center rounded-full bg-muted"><ClipboardCheck className="size-5 text-muted-foreground" /></span>
              <div><h2 className="font-medium">No remediation plans yet</h2><p className="mt-1 text-sm text-muted-foreground">Create a plan to coordinate vulnerability fixes and evidence.</p></div>
              <Button onClick={() => setIsCreateOpen(true)}><Plus className="size-4" /> Create a plan</Button>
            </CardContent>
          ) : visiblePlans.length === 0 ? (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">No plans match these filters.</CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead className="min-w-44">Progress</TableHead><TableHead>Owner & due date</TableHead><TableHead>Work items</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>{visiblePlans.map((plan) => {
                  const progress = calculateProgress(plan);
                  return <TableRow key={plan.id}>
                    <TableCell className="min-w-56"><p className="font-medium">{plan.name}</p><p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">{plan.description || "No description"}</p></TableCell>
                    <TableCell><Badge variant="outline" className={cn("font-medium", statusTone[plan.status])}>{formatLabel(plan.status)}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-3"><Progress value={progress} className="h-2 min-w-20" /><span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{progress}%</span></div><p className="mt-1 text-xs text-muted-foreground">{plan.vulnerabilities.filter(({ vulnerability }) => ["RESOLVED", "CLOSED"].includes(vulnerability.workflowState)).length} of {plan.vulnerabilities.length} resolved</p></TableCell>
                    <TableCell className="min-w-40"><p className="text-sm">{plan.owner?.name || plan.owner?.email || "Unassigned"}</p><p className="mt-1 text-xs text-muted-foreground">{plan.dueDate ? `Due ${new Date(plan.dueDate).toLocaleDateString()}` : "No due date"}</p></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{plan.vulnerabilities.length} vulnerabilities · {plan._count?.evidence || 0} evidence</TableCell>
                    <TableCell><div className="flex justify-end gap-2">
                      <Select value={plan.status} onValueChange={(value) => void updatePlanStatus(plan.id, value as RemediationStatus)}><SelectTrigger aria-label={`Change status for ${plan.name}`} className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{statusOptions.map((status) => <SelectItem key={status} value={status}>{formatLabel(status)}</SelectItem>)}</SelectGroup></SelectContent></Select>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedPlan(plan); setIsEvidenceOpen(true); }}><Paperclip className="size-4" /><span className="sr-only sm:not-sr-only">Evidence</span></Button>
                    </div></TableCell>
                  </TableRow>;
                })}</TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (open) setFormError(null); }}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Create remediation plan</DialogTitle><DialogDescription>Set the scope and target date for this remediation effort.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {formError ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
            <div className="space-y-2"><Label htmlFor="plan-name">Plan name</Label><Input id="plan-name" autoFocus value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="plan-description">Description</Label><Textarea id="plan-description" rows={3} value={createForm.description} onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Status</Label>
                <Select value={createForm.status} onValueChange={(value) => setCreateForm((prev) => ({ ...prev, status: value as RemediationStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{statusOptions.map((status) => <SelectItem key={status} value={status}>{formatLabel(status)}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Due date and time</Label><DatePickerField label="Choose a due date" includeTime value={createForm.dueDate} onChange={(dueDate) => setCreateForm((prev) => ({ ...prev, dueDate }))} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="plan-vulnerabilities">Vulnerability IDs</Label><Input id="plan-vulnerabilities" placeholder="Paste IDs separated by commas" value={createForm.vulnerabilityIds} onChange={(event) => setCreateForm((prev) => ({ ...prev, vulnerabilityIds: event.target.value }))} /><p className="text-xs text-muted-foreground">Separate multiple IDs with commas.</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button><Button onClick={() => void handleCreate()} disabled={!createForm.name.trim() || isSubmitting}>{isSubmitting ? "Creating…" : "Create plan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEvidenceOpen} onOpenChange={(open) => { setIsEvidenceOpen(open); if (!open) setSelectedPlan(null); }}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Add evidence</DialogTitle><DialogDescription>Attach verification material to {selectedPlan?.name || "this plan"}.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {formError ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
            <div className="space-y-2"><Label htmlFor="evidence-title">Title</Label><Input id="evidence-title" autoFocus value={evidenceForm.title} onChange={(event) => setEvidenceForm((prev) => ({ ...prev, title: event.target.value }))} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="evidence-file">File name</Label><Input id="evidence-file" value={evidenceForm.fileName} onChange={(event) => setEvidenceForm((prev) => ({ ...prev, fileName: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="evidence-mime">Content type</Label><Input id="evidence-mime" value={evidenceForm.mimeType} onChange={(event) => setEvidenceForm((prev) => ({ ...prev, mimeType: event.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="evidence-notes">Notes</Label><Textarea id="evidence-notes" rows={3} value={evidenceForm.notes} onChange={(event) => setEvidenceForm((prev) => ({ ...prev, notes: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="evidence-content">Text evidence</Label><Textarea id="evidence-content" rows={5} className="font-mono text-xs" placeholder="Paste command output, test results, or a log excerpt" value={evidenceForm.content} onChange={(event) => setEvidenceForm((prev) => ({ ...prev, content: event.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEvidenceOpen(false)}>Cancel</Button><Button onClick={() => void submitEvidence()} disabled={!evidenceForm.title.trim() || isSubmitting}>{isSubmitting ? "Saving…" : "Add evidence"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
