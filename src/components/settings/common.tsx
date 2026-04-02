import { cn } from "@/lib/utils";

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
    return (
        <label className={cn("relative inline-flex items-center", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer group")}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
            />
            <div className={cn(
                "w-11 h-6 bg-[var(--bg-elevated)] peer-focus:ring-2 peer-focus:ring-sky-500 rounded-full transition-all duration-300 peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 after:shadow-sm peer-checked:bg-sky-500",
                !disabled && "group-hover:ring-2 group-hover:ring-sky-500/20"
            )} />
        </label>
    );
}

export function SectionHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
    return (
        <div className="mb-6 space-y-1">
            <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{title}</h3>
                {badge && (
                    <span className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold uppercase py-0.5 px-2 rounded-full border border-sky-500/20 shadow-sm">
                        {badge}
                    </span>
                )}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
    );
}

export function SettingsSection({ children, id }: { children: React.ReactNode; id?: string }) {
    return (
        <div 
            id={id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
        >
            {children}
        </div>
    );
}

export function FormField({ label, children, description, error }: { label: string; children: React.ReactNode; description?: string; error?: string }) {
    return (
        <div className="space-y-1.5 flex flex-col items-start w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
                {label}
            </label>
            {children}
            {description && <p className="text-[11px] text-muted-foreground ml-1">{description}</p>}
            {error && <p className="text-[11px] text-red-500 ml-1">{error}</p>}
        </div>
    );
}

export function SettingsCard({ children, noPadding }: { children: React.ReactNode; noPadding?: boolean }) {
    return (
        <div className={cn(
            "bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden",
            !noPadding && "p-6"
        )}>
            {children}
        </div>
    );
}
