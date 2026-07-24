/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Engineer Light Design System Colors
        "primary": "#4353FF", // Accent Indigo
        "primary-hover": "#3444DD",
        "background-main": "#F8F9FC", // bg-base
        "surface-white": "#ffffff",
        "card-border": "#E5E7EB", // border-subtle
        "text-heading": "#1A1A2E", // text-primary
        "text-body": "#4B5563", // text-secondary
        "text-secondary": "#6B7280", // text-muted
        // Header specifics
        "header-wordmark": "#1A1A2E", // text-primary
        "header-logo-bg": "#4353FF", // accent-primary
        "input-bg": "#F3F4F6", // bg-surface-200
        // Charts
        "chart-sage": "#4353FF", // accent-primary (legacy alias, now indigo)
        "chart-gold": "#D97706", // status-warning
        "chart-slate-light": "#cbd5e1", // Slate 300 for donut
        "chart-slate": "#6B7280", // Keep for icons if needed
        // Table
        "table-header": "#F3F4F6", // bg-surface-200
        "table-divider": "#e2e8f0", // border-subtle
        // Button
        "btn-border": "#D1D5DB", // border-strong
        "btn-hover": "#E5E7EB", // bg-surface-300

        // Password Reset Page Colors
        "page": "#F8F9FC",
        "card": "#FFFFFF",
        "wordmark": "#1A1A2E",
        "logo-bg": "#4353FF",
        "btn-sage": "#4353FF",
        "btn-sage-hover": "#3444DD",
        "title-slate": "#1A1A2E",
        "body-slate": "#4B5563",
        "label-slate": "#64748B",
        "input-border": "#D1D5DB",
        "footer-slate": "#64748B",
        "footer-hover": "#4353FF",
        "copyright-slate": "#94A3B8",

        // GDPR Data Request Page Colors
        "stone": {
          bg: "#F8F9FC",      // Main Page Background
          border: "#D1D5DB",  // Unselected border / Textarea border
          off: "#F3F4F6",     // Form Section Background
          light: "#F8F9FC",
          DEFAULT: "#D1D5DB",
          backdrop: "#F8F9FC",
        },
        "sage": {
          DEFAULT: "#4353FF", // Primary Accent (Indigo)
          wash: "#EEF2FF",    // Light Indigo Wash
          dark: "#3444DD",
        },
        "slate": {
          50: "#F8F9FC",
          100: "#F3F4F6",     // Central Content Card Border
          200: "#E5E7EB",     // Divider
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",     // Secondary Labels / Footer
          600: "#4B5563",
          700: "#374151",     // Body Text
          800: "#1F2937",
          900: "#1A1A2E",     // Main Titles
        },
        "blue": {
          prof: "#2563EB",    // Professional Blue (status-info)
          wash: "#eff6ff",    // Light Blue Wash (blue-50)
        },
        "red": {
          prof: "#DC2626",    // Red (status-critical)
          wash: "#fee2e2",    // Light Red Wash (red-100)
        },

        // Legacy colors for backward compatibility
        "stone-bg": "#F8F9FC",
        "background-light": "#F8F9FC",
        "background-dark": "#181a18",
        "slate-text": "#4B5563",
        "slate-light": "#6B7280",
        "dark-olive": "#1A1A2E",
        "off-stone": "#F3F4F6",
        "sage-green": "#4353FF",
        "dark-sage": "#3444DD",
        "stone-border": "#D1D5DB",
        "slate-body": "#4B5563",
        "divider": "#e2e8f0",
        "page-bg": "#F8F9FC",
        "header-border": "#D1D5DB",
        "brand-dark": "#1A1A2E",
        "logo-bg": "#4353FF",
        "search-bg": "#F3F4F6",
        "primary-sage": "#4353FF",
        "sage-hover": "#3444DD",
        "txt-main": "#1A1A2E",
        "txt-body": "#4B5563",
        "txt-sub": "#6B7280",
        "dot-red": "#ef4444",
        "deep-sage": "#4353FF",
        "slate-900": "#1A1A2E",
        "slate-meta": "#6B7280",
        "slate-border-card": "#f1f5f9",
        "slate-border-divider": "#e2e8f0",
        "text-main": "#1A1A2E",
        "text-muted": "#6B7280",
        "surface-light": "#ffffff",
        "border-light": "#f1f5f9",
        "sage-dark": "#3444DD",
        "sage-wordmark": "#1A1A2E",
        sage: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#4353FF", // Primary Accent (Indigo)
          600: "#3444DD", // Accent Hover
          700: "#2A38B8",
          DEFAULT: "#4353FF",
          dark: "#3444DD",
          wordmark: "#1A1A2E",
        },
        "olive": "#1A1A2E",
        // Explicit Engineer Light tokens
        "accent-primary": "#4353FF",
        "accent-hover": "#3444DD",
        "bg-base": "#F8F9FC",
        "bg-surface-100": "#FFFFFF",
        "bg-surface-200": "#F3F4F6",
        "bg-surface-300": "#E5E7EB",
        "border-subtle": "#E5E7EB",
        "border-strong": "#D1D5DB",
        "text-primary": "#1A1A2E",
        "text-muted-2": "#64748B",
        "status-critical": "#DC2626",
        "status-warning": "#D97706",
        "status-info": "#2563EB",
        "status-success": "#16A34A",

        // Semantic layer (preferred names going forward)
        "surface-page": "#F8F9FC",
        "surface-card": "#FFFFFF",
        "surface-sunken": "#F3F4F6",
        "surface-hover": "#E5E7EB",
        "accent": "#4353FF",
        "accent-wash": "#EEF2FF",
        // Chart palette
        "chart-1": "#4353FF", // indigo
        "chart-2": "#0EA5E9", // sky
        "chart-3": "#16A34A", // emerald
        "chart-4": "#D97706", // amber
        "chart-5": "#8B5CF6", // violet
        // Ink ramp overrides for default utility classes (Ink & Parchment rebrand)
        "indigo": { 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 300: "#A5B4FC", 400: "#818CF8", 500: "#5B6CFF", 600: "#4353FF", 700: "#3444DD", 800: "#2A38B8", 900: "#1E2A8A" },
        "purple": { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9", 800: "#5B21B6", 900: "#4C1D95" },
        "violet": { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9", 800: "#5B21B6", 900: "#4C1D95" },
        "gold": { 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 400: "#5B6CFF", 600: "#4353FF", 800: "#3444DD", DEFAULT: "#4353FF" },
        // Semantic brand tokens (Ink & Parchment) — preferred over raw hex
        "parchment": { DEFAULT: "#F8F9FC", sunken: "#F3F4F6" },
        "ink": { DEFAULT: "#1A1A2E", deep: "#11121F", mid: "#5B6CFF", wash: "#EEF2FF" },
        "hairline": { DEFAULT: "#E5E7EB", strong: "#D1D5DB" },
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'display': ['Manrope', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'DEFAULT': '0.375rem', // rounded-md
        'lg': '0.5rem', // rounded-lg
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.01)',
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
