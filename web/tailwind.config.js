/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sage & Stone Design System Colors
        "primary": "#5f7261", // Sage Green
        "primary-hover": "#4b594e",
        "background-main": "#F9F9F7", // Stone
        "surface-white": "#ffffff", 
        "card-border": "#f1f5f9", // Slate 100
        "text-heading": "#0f172a", // Slate 900
        "text-body": "#334155", // Slate
        "text-secondary": "#64748b", // Slate 500
        // Header specifics
        "header-wordmark": "#354038", // Dark Olive
        "header-logo-bg": "#46544a", // Deep Sage
        "input-bg": "#f2f1ec", // Off-Stone
        // Charts
        "chart-sage": "#5f7261",
        "chart-gold": "#cbbf95", // Muted Gold
        "chart-slate-light": "#cbd5e1", // Slate 300 for donut
        "chart-slate": "#64748b", // Keep for icons if needed
        // Table
        "table-header": "#f2f1ec", // Off-Stone
        "table-divider": "#e2e8f0", // Slate 200
        // Button
        "btn-border": "#e6e5e0", // Stone border
        "btn-hover": "#f8fafc", // Hover Stone
        
        // Password Reset Page Colors
        "page": "#F9F9F7",
        "card": "#FFFFFF",
        "wordmark": "#354038",
        "logo-bg": "#46544A",
        "btn-sage": "#5F7261",
        "btn-sage-hover": "#4B5C4D",
        "title-slate": "#0F172A",
        "body-slate": "#334155",
        "label-slate": "#64748B",
        "input-border": "#E6E5E0",
        "footer-slate": "#64748B",
        "footer-hover": "#5F7261",
        "copyright-slate": "#94A3B8",
        
        // GDPR Data Request Page Colors
        "stone": {
          bg: "#F9F9F7",      // Main Page Background
          border: "#e6e5e0",  // Unselected border / Textarea border
          off: "#f2f1ec",     // Form Section Background
          light: "#F9F9F7",
          DEFAULT: "#e6e5e0",
          backdrop: "#F9F9F7",
        },
        "sage": {
          DEFAULT: "#5f7261", // Primary Sage
          wash: "#F0F4F1",    // Light Sage Wash
          dark: "#4b5c4d",
        },
        "slate": {
          50: "#f8fafc",
          100: "#f1f5f9",     // Central Content Card Border
          200: "#e2e8f0",     // Divider
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",     // Secondary Labels / Footer
          600: "#475569",
          700: "#334155",     // Body Text
          800: "#1e293b",
          900: "#0f172a",     // Main Titles
        },
        "blue": {
          prof: "#3b82f6",    // Professional Blue
          wash: "#eff6ff",    // Light Blue Wash (blue-50)
        },
        "red": {
          prof: "#ef4444",    // Red
          wash: "#fee2e2",    // Light Red Wash (red-100)
        },
        
        // Legacy colors for backward compatibility
        "stone-bg": "#F9F9F7", // Stone
        "background-light": "#F9F9F7",
        "background-dark": "#181a18",
        "slate-text": "#334155",
        "slate-light": "#64748b",
        "dark-olive": "#354038",
        "off-stone": "#f2f1ec",
        "sage-green": "#5f7261",
        "dark-sage": "#4b5c4d",
        "stone-border": "#e6e5e0",
        "slate-body": "#334155",
        "divider": "#e2e8f0",
        "page-bg": "#F9F9F7",
        "header-border": "#e6e5e0",
        "brand-dark": "#354038",
        "logo-bg": "#46544a",
        "search-bg": "#f2f1ec",
        "primary-sage": "#5f7261",
        "sage-hover": "#4b5c4d",
        "txt-main": "#0f172a",
        "txt-body": "#334155",
        "txt-sub": "#64748b",
        "dot-red": "#ef4444",
        "deep-sage": "#46544a",
        "slate-900": "#0f172a",
        "slate-meta": "#64748b",
        "slate-border-card": "#f1f5f9",
        "slate-border-divider": "#e2e8f0",
        "text-main": "#0f172a",
        "text-muted": "#64748b",
        "surface-light": "#ffffff",
        "border-light": "#f1f5f9",
        "sage-dark": "#4a5d50",
        "sage-wordmark": "#354038",
        sage: {
          50: "#f4f7f4",
          100: "#e3ebe3",
          200: "#c5d6c5",
          300: "#9bb89b",
          400: "#729672",
          500: "#5f7261", // Primary Sage
          600: "#4b5c4d", // Dark Sage (Hover)
          700: "#3d4a3e",
          DEFAULT: "#5f7261",
          dark: "#4a5d50",
          wordmark: "#354038",
        },
        "olive": "#354038",
        stone: {
          50: "#F9F9F7", // Main Background
          100: "#f0f0ed",
          200: "#e6e5e0", // Borders
          300: "#c8c8c2",
          DEFAULT: "#F9F9F7",
          off: "#f2f1ec",
          border: "#e6e5e0",
          sidebar: "#f2f1ec",
          divider: "#e6e5e0",
        },
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'display': ['Manrope', 'sans-serif'],
        'body': ['Manrope', 'sans-serif'],
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
        'soft': '0 2px 10px rgba(95, 114, 97, 0.05)',
      },
    },
  },
  plugins: [],
};
