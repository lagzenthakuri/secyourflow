import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { NavigationProgress } from "@/components/providers/NavigationProgress";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

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
      var preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
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
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
        <ThemeProvider>
          <NavigationProgress />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
