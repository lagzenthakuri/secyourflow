import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { NavigationProgress } from "@/components/providers/NavigationProgress";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <NavigationProgress />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
