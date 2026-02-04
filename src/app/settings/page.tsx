"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import {
    Settings,
    Bell,
    Shield,
    Database,
    Globe,
    Key,
    Mail,
    Palette,
    Clock,
    Save,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const settingsSections = [
    { id: "general", label: "General", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Database },
    { id: "api", label: "API Access", icon: Key },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState("general");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/settings");
            const data = await response.json();
            setSettings(data);
        } catch (error) {
            console.error("Failed to fetch settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const response = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (response.ok) {
                const data = await response.json();
                setSettings({ ...settings, ...data });
                // Simple feedback - could be improved with a Toast component
                alert("Settings saved successfully!");
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            alert("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        Configure platform settings and preferences
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Settings Navigation */}
                    <div className="lg:col-span-3">
                        <div className="card p-2">
                            {settingsSections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                                        activeSection === section.id
                                            ? "bg-blue-500/15 text-blue-400"
                                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <section.icon size={18} />
                                    <span className="text-sm font-medium">{section.label}</span>
                                    <ChevronRight size={16} className="ml-auto opacity-50" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="lg:col-span-9">
                        {activeSection === "general" && (
                            <Card title="General Settings" subtitle="Basic platform configuration">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Organization Name
                                        </label>
                                        <input
                                            type="text"
                                            value={settings?.organizationName || ""}
                                            onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Primary Domain
                                        </label>
                                        <input
                                            type="text"
                                            value={settings?.domain || ""}
                                            onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Timezone
                                        </label>
                                        <select
                                            className="input"
                                            value={settings?.timezone || "UTC"}
                                            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                                        >
                                            <option>UTC</option>
                                            <option>America/New_York</option>
                                            <option>Europe/London</option>
                                            <option>Asia/Tokyo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Date Format
                                        </label>
                                        <select
                                            className="input"
                                            value={settings?.dateFormat || "MMM DD, YYYY"}
                                            onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                                        >
                                            <option>MMM DD, YYYY</option>
                                            <option>DD/MM/YYYY</option>
                                            <option>YYYY-MM-DD</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 border-t border-[var(--border-color)]">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            <Save size={16} />
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeSection === "notifications" && (
                            <Card title="Notification Settings" subtitle="Configure alerts and notifications">
                                <div className="space-y-4">
                                    {[
                                        {
                                            id: "notifyCritical",
                                            title: "Critical Vulnerability Alerts",
                                            description: "Get notified when critical vulnerabilities are detected",
                                        },
                                        {
                                            id: "notifyExploited",
                                            title: "Exploitation Alerts",
                                            description: "Alert when a vulnerability in your environment is being exploited",
                                        },
                                        {
                                            id: "notifyCompliance",
                                            title: "Compliance Drift",
                                            description: "Notify when compliance status changes",
                                        },
                                        {
                                            id: "notifyScan",
                                            title: "Scan Completion",
                                            description: "Alert when vulnerability scans complete",
                                        },
                                        {
                                            id: "notifyWeekly",
                                            title: "Weekly Summary",
                                            description: "Receive weekly risk summary via email",
                                        },
                                    ].map((notification) => (
                                        <div
                                            key={notification.id}
                                            className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]"
                                        >
                                            <div>
                                                <h4 className="text-sm font-medium text-white">
                                                    {notification.title}
                                                </h4>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    {notification.description}
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings?.[notification.id] || false}
                                                    onChange={(e) => setSettings({ ...settings, [notification.id]: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
                                            </label>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-[var(--border-color)]">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            <Save size={16} />
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeSection === "security" && (
                            <Card title="Security Settings" subtitle="Authentication and access control">
                                <div className="space-y-6">
                                    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <h4 className="text-sm font-medium text-white">
                                                    Two-Factor Authentication
                                                </h4>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    Require 2FA for all users
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings?.require2FA || false}
                                                    onChange={(e) => setSettings({ ...settings, require2FA: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Session Timeout (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            value={settings?.sessionTimeout || 30}
                                            onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                                            className="input w-32"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">
                                            Password Policy
                                        </label>
                                        <select
                                            className="input"
                                            value={settings?.passwordPolicy || "STRONG"}
                                            onChange={(e) => setSettings({ ...settings, passwordPolicy: e.target.value })}
                                        >
                                            <option value="STRONG">Strong (12+ chars, mixed case, numbers, symbols)</option>
                                            <option value="MEDIUM">Medium (8+ chars, mixed case, numbers)</option>
                                            <option value="BASIC">Basic (8+ chars)</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 border-t border-[var(--border-color)]">
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            <Save size={16} />
                                            {isSaving ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeSection === "integrations" && (
                            <Card title="Integrations" subtitle="Third-party service connections">
                                <div className="space-y-4">
                                    {[
                                        { name: "Slack", status: "connected", icon: "💬" },
                                        { name: "Microsoft Teams", status: "not_connected", icon: "📱" },
                                        { name: "Jira", status: "connected", icon: "📋" },
                                        { name: "ServiceNow", status: "not_connected", icon: "🔧" },
                                        { name: "PagerDuty", status: "connected", icon: "🚨" },
                                    ].map((integration) => (
                                        <div
                                            key={integration.name}
                                            className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{integration.icon}</span>
                                                <div>
                                                    <h4 className="text-sm font-medium text-white">
                                                        {integration.name}
                                                    </h4>
                                                    <p
                                                        className={cn(
                                                            "text-xs",
                                                            integration.status === "connected"
                                                                ? "text-green-400"
                                                                : "text-[var(--text-muted)]"
                                                        )}
                                                    >
                                                        {integration.status === "connected"
                                                            ? "Connected"
                                                            : "Not Connected"}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                className={cn(
                                                    "btn text-sm py-1.5",
                                                    integration.status === "connected"
                                                        ? "btn-secondary"
                                                        : "btn-primary"
                                                )}
                                            >
                                                {integration.status === "connected" ? "Configure" : "Connect"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {activeSection === "api" && (
                            <Card title="API Access" subtitle="Manage API keys and access tokens">
                                <div className="space-y-6">
                                    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                                        <h4 className="text-sm font-medium text-white mb-3">API Keys</h4>
                                        <div className="space-y-3">
                                            {[
                                                { name: "Production API Key", created: "Jan 1, 2024", lastUsed: "Today" },
                                                { name: "Development Key", created: "Dec 15, 2023", lastUsed: "3 days ago" },
                                            ].map((key) => (
                                                <div
                                                    key={key.name}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]"
                                                >
                                                    <div>
                                                        <p className="text-sm text-white">{key.name}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            Created: {key.created} • Last used: {key.lastUsed}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button className="btn btn-ghost text-xs py-1">Reveal</button>
                                                        <button className="btn btn-ghost text-xs py-1 text-red-400">
                                                            Revoke
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="btn btn-secondary mt-3">
                                            <Key size={14} />
                                            Generate New Key
                                        </button>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white mb-2">API Documentation</h4>
                                        <p className="text-sm text-[var(--text-muted)] mb-3">
                                            Access the API documentation to integrate SecYourFlow with your tools.
                                        </p>
                                        <button className="btn btn-secondary">
                                            <Globe size={14} />
                                            View API Docs
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
