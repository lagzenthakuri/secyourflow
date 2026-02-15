import type { NextConfig } from "next";

function buildCspHeaderValue(): string {
  const isProd = process.env.NODE_ENV === "production";

  // Baseline CSP intended to avoid breaking Next.js while still adding meaningful guardrails.
  // In dev, Next tooling relies on eval and websocket connections.
  const directives: string[] = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    `connect-src 'self'${isProd ? " https: wss:" : " http: https: ws: wss:"}`,
  ];

  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  // Turbopack for faster dev builds
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["exceljs"],

  // Enable React strict mode
  reactStrictMode: true,

  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Optimize package imports
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query'],
  },

  // Enable compression
  compress: true,

  // Standalone output for Docker
  output: "standalone",

  poweredByHeader: false,

  // Security and performance headers
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const csp = buildCspHeaderValue();

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains",
                },
              ]
            : []),
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
