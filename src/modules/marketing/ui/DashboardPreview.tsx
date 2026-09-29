import Image from "next/image";

export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#101113] shadow-2xl shadow-slate-950/20">
      <Image
        src="/screenshots/dashboard-preview.png"
        alt="Illustrative SecYourFlow dashboard showing asset totals, remediation progress, CISA KEV records, priority findings, and risk breakdown. Values are sample data."
        width={1128}
        height={1326}
        priority
        sizes="(max-width: 1024px) 100vw, 58vw"
        className="h-auto w-full"
      />
    </div>
  );
}
