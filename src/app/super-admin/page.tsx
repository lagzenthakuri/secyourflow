"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import { Plus, Building2, Users, CheckCircle2, XCircle, Copy, Mail, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

type OrganizationRecord = {
    id: string;
    name: string;
    isActive: boolean;
    productKey?: {
        key: string;
        userLimit: number;
        expiry: string;
    } | null;
    _count?: {
        users: number;
    };
    mainOfficerEmail?: string | null;
    activationLink?: string | null;
};

type NewOrganizationResult = {
    organizationId: string;
    productKey: string;
    activationLink: string;
    emailStatus?: "sent" | "not_configured" | "failed";
    emailError?: string | null;
};

export default function SuperAdminPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newOrgResult, setNewOrgResult] = useState<NewOrganizationResult | null>(null);
    const [actionLoadingByOrg, setActionLoadingByOrg] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role !== "SUPER_ADMIN") {
            router.push("/dashboard");
        } else if (status === "authenticated") {
            fetchOrganizations();
        }
    }, [status, session, router]);

    const fetchOrganizations = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/super-admin/organizations");
            const data = await res.json();
            if (Array.isArray(data)) {
                setOrganizations(data as OrganizationRecord[]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrg = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const body = {
            name: formData.get("name"),
            email: formData.get("email"),
            userLimit: parseInt(formData.get("userLimit") as string),
            expiryMonths: parseInt(formData.get("expiryMonths") as string),
        };

        try {
            setIsLoading(true);
            const res = await fetch("/api/super-admin/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setNewOrgResult(data);
                fetchOrganizations();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to create organization");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyValue = async (value: string | null | undefined, label: string) => {
        if (!value) {
            alert(`${label} is not available`);
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            alert(`${label} copied`);
        } catch (error) {
            console.error(error);
            alert(`Failed to copy ${label.toLowerCase()}`);
        }
    };

    const handleResendInvite = async (organizationId: string) => {
        try {
            setActionLoadingByOrg((prev) => ({ ...prev, [organizationId]: true }));
            const res = await fetch(`/api/super-admin/organizations/${organizationId}/resend-activation`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to resend invite");
                return;
            }

            alert(data.message || "Invite re-sent");
            await fetchOrganizations();
        } catch (error) {
            console.error(error);
            alert("Failed to resend invite");
        } finally {
            setActionLoadingByOrg((prev) => ({ ...prev, [organizationId]: false }));
        }
    };

    if (status === "loading" || isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <ShieldLoader size="lg" variant="cyber" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Administration</h1>
                        <p className="text-[var(--text-secondary)]">Manage organizations and licensing</p>
                    </div>
                    <button
                        onClick={() => {
                            setNewOrgResult(null);
                            setIsCreateModalOpen(true);
                        }}
                        className="btn btn-primary"
                    >
                        <Plus size={16} />
                        New Organization
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card p-4 className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{organizations.length}</p>
                            <p className="text-xs text-[var(--text-muted)]">Total Organizations</p>
                        </div>
                    </Card>
                    <Card p-4 className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {organizations.filter(o => o.isActive).length}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Active Licenses</p>
                        </div>
                    </Card>
                    <Card p-4 className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {organizations.reduce((acc, o) => acc + (o._count?.users || 0), 0)}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Total Platform Users</p>
                        </div>
                    </Card>
                </div>

                <Card title="Organization Directory" noPadding>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">Organization</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">License Key</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">Main Officer</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">Users</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">Expiry</th>
                                    <th className="p-4 text-xs font-semibold uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {organizations.map((org) => (
                                    <tr key={org.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-[var(--text-primary)]">{org.name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{org.id}</div>
                                        </td>
                                        <td className="p-4">
                                            {org.isActive ? (
                                                <span className="badge badge-success">Active</span>
                                            ) : (
                                                <span className="badge badge-warning">Pending</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-mono text-sm">
                                            {org.productKey?.key || "N/A"}
                                        </td>
                                        <td className="p-4 text-sm">
                                            {org.mainOfficerEmail || "Not assigned"}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm">
                                                {org._count?.users} / {org.productKey?.userLimit || "∞"}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            {org.productKey?.expiry ? new Date(org.productKey.expiry).toLocaleDateString() : "Permanent"}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)]"
                                                    title="Copy product key"
                                                    onClick={() => handleCopyValue(org.productKey?.key, "Product key")}
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] disabled:opacity-50"
                                                    title="Copy activation link"
                                                    onClick={() => handleCopyValue(org.activationLink, "Activation link")}
                                                    disabled={!org.activationLink}
                                                >
                                                    <Mail size={16} />
                                                </button>
                                                <button
                                                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-muted)] disabled:opacity-50"
                                                    title="Resend activation email"
                                                    onClick={() => handleResendInvite(org.id)}
                                                    disabled={Boolean(actionLoadingByOrg[org.id])}
                                                >
                                                    <RefreshCw size={16} className={actionLoadingByOrg[org.id] ? "animate-spin" : ""} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {organizations.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-sm text-[var(--text-muted)]">
                                            No organizations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Create Org Modal */}
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="card w-full max-w-lg p-6 border-t-4 border-intent-accent overflow-y-auto max-h-[90vh]">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold">Provision New Organization</h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {newOrgResult ? (
                                <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
                                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex flex-col items-center text-center gap-3">
                                        <CheckCircle2 size={48} />
                                        <div>
                                            <p className="font-bold">Organization Provisioned!</p>
                                            <p className="text-sm">The platform is ready for the Main Officer.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Product Key</label>
                                            <div className="flex items-center gap-2 p-3 bg-[var(--bg-elevated)] rounded-lg font-mono">
                                                <span className="flex-1">{newOrgResult.productKey}</span>
                                                <button onClick={() => navigator.clipboard.writeText(newOrgResult.productKey)} className="text-intent-accent p-1 hover:bg-intent-accent/10 rounded">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Activation Link</label>
                                            <div className="flex items-center gap-2 p-3 bg-[var(--bg-elevated)] rounded-lg break-all text-xs">
                                                <span className="flex-1">{newOrgResult.activationLink}</span>
                                                <button onClick={() => navigator.clipboard.writeText(newOrgResult.activationLink)} className="text-intent-accent p-1 hover:bg-intent-accent/10 rounded">
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {newOrgResult.emailStatus && newOrgResult.emailStatus !== "sent" && (
                                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                                            Mail not sent automatically. {newOrgResult.emailError || "Please verify mail configuration."}
                                        </div>
                                    )}

                                    <button onClick={() => setIsCreateModalOpen(false)} className="btn btn-primary w-full">Done</button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateOrg} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Organization Name</label>
                                            <input name="name" type="text" placeholder="Acme Corp" className="input" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Officer Email</label>
                                            <input name="email" type="email" placeholder="admin@acme.com" className="input" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">User Limit</label>
                                            <input name="userLimit" type="number" defaultValue={10} className="input" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">License Duration (Months)</label>
                                            <input name="expiryMonths" type="number" defaultValue={12} className="input" required />
                                        </div>
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn btn-secondary flex-1">Cancel</button>
                                        <button type="submit" disabled={isLoading} className="btn btn-primary flex-1">
                                            {isLoading ? "Provisioning..." : "Generate & Invite"}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
