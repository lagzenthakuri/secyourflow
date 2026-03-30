"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Building2, User, Lock, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

export default function SetupPage() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkSetupStatus = async () => {
            try {
                const res = await fetch("/api/setup");
                const data = await res.json();
                if (!data.setupRequired) {
                    router.push("/login");
                } else {
                    setIsChecking(false);
                }
            } catch (err) {
                console.error(err);
                setIsChecking(false);
            }
        };
        checkSetupStatus();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const body = Object.fromEntries(formData.entries());

        try {
            const res = await fetch("/api/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (res.ok) {
                setIsSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setError(data.error || "Setup failed");
            }
        } catch (err) {
            setError("Internal error occurred during setup.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-950">
                <ShieldLoader size="lg" variant="cyber" />
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-200 overflow-hidden font-sans">
            {/* Background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-grid-slate-900/[0.2] [mask-image:radial-gradient(ellipse_at_center,black,transparent)]" />
            </div>

            <main className="relative z-10 w-full max-w-md px-6">
                <header className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-sky-400 mb-4 animate-in zoom-in duration-500">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Platform Initialize</h1>
                    <p className="text-slate-400 text-sm mt-2">Provision the root administrator and core organization.</p>
                </header>

                <div className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                    
                    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
                        {isSuccess ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                <div className="p-4 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                                    <CheckCircle2 className="w-12 h-12" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">System Provisioned</h3>
                                    <p className="text-slate-400 text-sm mt-1">Redirecting to login portal...</p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-widest text-sky-500 mb-4">Core Organization</h3>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <input 
                                                name="organizationName" 
                                                required 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" 
                                                placeholder="Organization Name"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-semibold uppercase tracking-widest text-sky-500 mb-4">Super Administrator</h3>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <input 
                                                name="name" 
                                                required 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" 
                                                placeholder="Full Name"
                                            />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                            <input 
                                                name="email" 
                                                type="email" 
                                                required 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" 
                                                placeholder="Admin Email"
                                            />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                                <Lock className="w-4 h-4" />
                                            </div>
                                            <input 
                                                name="password" 
                                                type="password" 
                                                required 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" 
                                                placeholder="System Password"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {error && (
                                    <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-xs text-center font-medium animate-in slide-in-from-top-1 duration-300">
                                        {error}
                                    </div>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-400/50 text-white font-semibold py-3 rounded-xl shadow-[0_10px_20px_-8px_rgba(14,165,233,0.5)] transition group"
                                >
                                    {isLoading ? "Provisioning..." : "Finalize Infrastructure"}
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <footer className="mt-8 text-center">
                    <p className="text-slate-500 text-xs tracking-wide">
                        SECYOURFLOW v0.1.0-alpha • SYSTEM_BOOTSTRAP_READY
                    </p>
                </footer>
            </main>
        </div>
    );
}
