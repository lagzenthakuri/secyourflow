"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

const StructureFlowCollection = dynamic(
  () => import("@designcodeio/threeui/components/StructureFlowCollection").then((module) => module.StructureFlowCollection),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#09090b]" />,
  },
);

export function NebulaHeroBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = backgroundRef.current;
    if (!container) return;

    let frame: HTMLIFrameElement | null = null;
    let visible = false;
    const sendVisibility = () => {
      frame?.contentWindow?.postMessage({ type: "secyourflow-nebula-visibility", visible }, "*");
    };
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sendVisibility();
    });
    intersectionObserver.observe(container);

    const attachFrame = () => {
      const nextFrame = container.querySelector("iframe");
      if (!nextFrame || nextFrame === frame) return;
      frame?.removeEventListener("load", sendVisibility);
      frame = nextFrame;
      frame.addEventListener("load", sendVisibility);
      sendVisibility();
    };
    attachFrame();
    const mutationObserver = new MutationObserver(attachFrame);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      frame?.removeEventListener("load", sendVisibility);
    };
  }, []);

  return (
    <div ref={backgroundRef} aria-hidden="true" className="landing-hero-nebula pointer-events-none absolute inset-0 z-0 overflow-hidden">
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
