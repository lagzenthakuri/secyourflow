"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function LandingBrand() {
  const [showWordmark, setShowWordmark] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("landing-hero");
    if (!hero) {
      setShowWordmark(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const nextShowWordmark = !entry.isIntersecting;
      setShowWordmark((current) => current === nextShowWordmark ? current : nextShowWordmark);
    }, { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <Link href="/" className="relative flex shrink-0 items-center" aria-label="SecYourFlow home">
      <Image src="/logo1.png" alt="" width={34} height={34} priority className="h-[34px] w-auto" />
      <span
        aria-hidden={!showWordmark}
        className={`absolute left-full ml-2 whitespace-nowrap text-sm font-semibold tracking-[0.14em] transition-[opacity,transform,visibility] duration-300 ease-out motion-reduce:transition-none [will-change:transform,opacity] ${showWordmark ? "visible translate-x-0 opacity-100" : "invisible translate-x-1 opacity-0"}`}
      >
        SECYOUR<span className="text-muted-foreground">FLOW</span>
      </span>
    </Link>
  );
}
