"use client";

import dynamic from "next/dynamic";

const StructureFlowCollection = dynamic(
  () => import("@designcodeio/threeui/components/StructureFlowCollection").then((module) => module.StructureFlowCollection),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#09090b]" />,
  },
);

export function NebulaHeroBackground() {
  return (
    <div aria-hidden="true" className="landing-hero-nebula pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <StructureFlowCollection
        className="absolute inset-0 h-full w-full border-0"
        variant="nebula"
        hue={-63}
        saturation={1.23}
        brightness={1.03}
      />
    </div>
  );
}
