import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom theme colors using CSS variables
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border': 'var(--border-color)',
        'border-hover': 'var(--border-hover)',
        'intent-accent': 'var(--intent-accent)',
        'intent-accent-strong': 'var(--intent-accent-strong)',
        'intent-danger': 'var(--intent-danger)',
        'intent-danger-strong': 'var(--intent-danger-strong)',
        'intent-success': 'var(--intent-success)',
      },
      backgroundColor: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
      },
      textColor: {
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'intent-accent': 'var(--intent-accent)',
        'intent-danger': 'var(--intent-danger)',
        'intent-success': 'var(--intent-success)',
      },
      borderColor: {
        'border': 'var(--border-color)',
        'border-hover': 'var(--border-hover)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
      },
    },
  },
  plugins: [],
  darkMode: ['selector', '[class="theme-dark"]'],
};

export default config;
