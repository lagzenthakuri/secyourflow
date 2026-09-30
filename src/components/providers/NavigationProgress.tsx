"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingBar } from "@/components/ui/LoadingBar";

export function NavigationProgress() {
  const _pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        setIsLoading(true);
        setProgress(0);
      }, 0)
    );

    timers.push(setTimeout(() => setProgress(30), 100));
    timers.push(setTimeout(() => setProgress(60), 300));
    timers.push(setTimeout(() => setProgress(90), 600));

    timers.push(
      setTimeout(() => {
        setProgress(100);
        timers.push(setTimeout(() => setIsLoading(false), 200));
      }, 800)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <LoadingBar
      height={3}
      isLoading={isLoading}
      position="top"
      progress={progress}
      variant="cyber"
    />
  );
}
