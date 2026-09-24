/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Engineer Light Design System Colors
        "primary": "#4353FF", // Accent Indigo
        "primary-hover": "#2F39C7",
        "background-main": "#FAF8F3", // bg-base
        "surface-white": "#ffffff",
        "card-border": "#E5E7EB", // border-subtle
        "text-heading": "#14142B", // text-primary
        "text-body": "#4B5563", // text-secondary
        "text-secondary": "#6B7280", // text-muted
        // Header specifics
        "header-wordmark": "#14142B", // text-primary
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
        "page": "#FAF8F3",
        "card": "#FFFFFF",
        "wordmark": "#14142B",
        "logo-bg": "#4353FF",
        "btn-sage": "#4353FF",
        "btn-sage-hover": "#2F39C7",
        "title-slate": "#14142B",
        "body-slate": "#4B5563",
        "label-slate": "#64748B",
        "input-border": "#D1D5DB",
        "footer-slate": "#64748B",
        "footer-hover": "#4353FF",
        "copyright-slate": "#94A3B8",

        // GDPR Data Request Page Colors
        "stone": {
          bg: "#FAF8F3",      // Main Page Background
          border: "#D1D5DB",  // Unselected border / Textarea border
          off: "#F3F4F6",     // Form Section Background
          light: "#FAF8F3",
          DEFAULT: "#D1D5DB",
          backdrop: "#FAF8F3",
        },
        "sage": {
          DEFAULT: "#4353FF", // Primary Accent (Indigo)
          wash: "#EEF2FF",    // Light Indigo Wash
          dark: "#2F39C7",
        },
        "slate": {
          50: "#FAF8F3",
          100: "#F3F4F6",     // Central Content Card Border
          200: "#E5E7EB",     // Divider
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",     // Secondary Labels / Footer
          600: "#4B5563",
          700: "#374151",     // Body Text
          800: "#1F2937",
          900: "#14142B",     // Main Titles
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
        "stone-bg": "#FAF8F3",
        "background-light": "#FAF8F3",
        "background-dark": "#181a18",
        "slate-text": "#4B5563",
        "slate-light": "#6B7280",
        "dark-olive": "#14142B",
        "off-stone": "#F3F4F6",
        "sage-green": "#4353FF",
        "dark-sage": "#2F39C7",
        "stone-border": "#D1D5DB",
        "slate-body": "#4B5563",
        "divider": "#e2e8f0",
        "page-bg": "#FAF8F3",
        "header-border": "#D1D5DB",
        "brand-dark": "#14142B",
        "logo-bg": "#4353FF",
        "search-bg": "#F3F4F6",
        "primary-sage": "#4353FF",
        "sage-hover": "#2F39C7",
        "txt-main": "#14142B",
        "txt-body": "#4B5563",
        "txt-sub": "#6B7280",
        "dot-red": "#ef4444",
        "deep-sage": "#4353FF",
        "slate-900": "#14142B",
        "slate-meta": "#6B7280",
        "slate-border-card": "#f1f5f9",
        "slate-border-divider": "#e2e8f0",
        "text-main": "#14142B",
        "text-muted": "#6B7280",
        "surface-light": "#ffffff",
        "border-light": "#f1f5f9",
        "sage-dark": "#2F39C7",
        "sage-wordmark": "#14142B",
        sage: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#4353FF", // Primary Accent (Indigo)
          600: "#2F39C7", // Accent Hover
          700: "#2A38B8",
          DEFAULT: "#4353FF",
          dark: "#2F39C7",
          wordmark: "#14142B",
        },
        "olive": "#14142B",
        // Explicit Engineer Light tokens
        "accent-primary": "#4353FF",
        "accent-hover": "#2F39C7",
        "bg-base": "#FAF8F3",
        "bg-surface-100": "#FFFFFF",
        "bg-surface-200": "#F3F4F6",
        "bg-surface-300": "#E5E7EB",
        "border-subtle": "#E5E7EB",
        "border-strong": "#D1D5DB",
        "text-primary": "#14142B",
        "text-muted-2": "#64748B",
        "status-critical": "#DC2626",
        "status-warning": "#D97706",
        "status-info": "#2563EB",
        "status-success": "#059669",
        "success": "#059669",

        // Semantic layer (preferred names going forward)
        "surface-page": "#FAF8F3",
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
        "indigo": { 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 300: "#A5B4FC", 400: "#818CF8", 500: "#5B6CFF", 600: "#4353FF", 700: "#2F39C7", 800: "#2A38B8", 900: "#1E2A8A" },
        "purple": { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9", 800: "#5B21B6", 900: "#4C1D95" },
        "violet": { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9", 800: "#5B21B6", 900: "#4C1D95" },
        "gold": { 50: "#EEF2FF", 100: "#E0E7FF", 200: "#C7D2FE", 400: "#5B6CFF", 600: "#4353FF", 800: "#2F39C7", DEFAULT: "#4353FF" },
        // Semantic brand tokens (Ink & Parchment) — preferred over raw hex
        "parchment": { DEFAULT: "#FAF8F3", sunken: "#F3F4F6" },
        "ink": { DEFAULT: "#14142B", deep: "#11121F", mid: "#5B6CFF", wash: "#EEF2FF" },
        "hairline": { DEFAULT: "#E5E7EB", strong: "#D1D5DB" },

        // Redesign status semantics (pill/badge tints — match score, referral status)
        "success-tint": "#ECFDF5",
        "success-ink": "#065F46",
        "amber-tint": "#FFF6E5",
        "amber-ink": "#92400E",
        "danger-tint": "#FEF2F2",
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'display': ['Manrope', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        'poppins': ['Poppins', 'sans-serif'],
        'playfair': ['"Playfair Display"', 'Georgia', 'serif'],
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
      keyframes: {
        'fill-bar': { from: { width: '0%' }, to: { width: '100%' } },
        'indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
      },
      animation: {
        'fill-bar-3s': 'fill-bar 3s linear forwards',
        'indeterminate': 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
