"use client";

import { type ComponentType, useEffect, useState } from "react";

export function VercelToolbarClient() {
  const shouldLoadToolbar =
    process.env.NODE_ENV !== "development" ||
    Boolean(process.env.NEXT_PUBLIC_VERCEL_TOOLBAR_PROJECT_ID);
  const [Toolbar, setToolbar] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!shouldLoadToolbar) {
      return;
    }

    let active = true;
    import("@vercel/toolbar/next")
      .then(({ VercelToolbar }) => {
        if (active) {
          setToolbar(() => VercelToolbar);
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to load the Vercel Toolbar:", error);
      });

    return () => {
      active = false;
    };
  }, [shouldLoadToolbar]);

  if (!(shouldLoadToolbar && Toolbar)) {
    return null;
  }
  return <Toolbar />;
}
