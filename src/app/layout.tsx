import type { Metadata } from "next";
import "./globals.css";
import "@designcodeio/threeui/style.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { TooltipProvider } from "@repo/design-system/components/ui/tooltip";
import { fonts } from "@repo/design-system/lib/fonts";
import { Toolbar } from "@repo/feature-flags/components/toolbar";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { NativeFormValidation } from "@/components/providers/NativeFormValidation";
import { NavigationProgress } from "@/components/providers/NavigationProgress";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { UiFeedbackProvider } from "@/components/providers/UiFeedbackProvider";

export const metadata: Metadata = {
  title: "SecYourFlow | Cyber Risk Operations Platform",
  description:
    "Unify vulnerabilities, assets, live threats, and compliance controls into one platform. Know what's exposed, what's being exploited, and what could hurt your business.",
  keywords: [
    "cyber risk",
    "vulnerability management",
    "threat intelligence",
    "compliance",
    "CVSS",
    "EPSS",
    "CISA KEV",
    "security operations",
  ],
  authors: [{ name: "SecYourFlow" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "SecYourFlow | Cyber Risk Operations Platform",
    description:
      "Unify vulnerabilities, assets, live threats, and compliance controls into one platform.",
    type: "website",
  },
};

const themeBootstrapScript = `
  (function () {
    try {
      var root = document.documentElement;
      var stored = window.localStorage.getItem("secyourflow.theme.mode.v1");
      var preferred = stored === "light" || stored === "dark"
        ? stored
        : "dark";
      root.classList.remove("theme-dark", "theme-light", "dark");
      if (preferred === "light") {
        root.classList.add("theme-light");
      } else {
        root.classList.add("theme-dark", "dark");
      }
      root.style.colorScheme = preferred;
    } catch (_) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${fonts} theme-dark dark`}
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased">
        <AnalyticsProvider>
          <ThemeProvider>
            <UiFeedbackProvider>
              <TooltipProvider>
                <NativeFormValidation />
                <NavigationProgress />
                <AuthProvider>{children}</AuthProvider>
              </TooltipProvider>
            </UiFeedbackProvider>
          </ThemeProvider>
          <Toolbar />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
