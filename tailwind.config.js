/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          pressed: "var(--accent-pressed)",
          tint: "var(--accent-tint)",
          border: "var(--accent-border)",
          contrast: "var(--accent-contrast)",
          ring: "var(--accent-ring)",
        },
        pop: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          hover: "var(--color-surface-hover)",
        },
        borderhair: {
          DEFAULT: "var(--color-border)",
          dark: "var(--color-border-dark)",
        },
        ink: {
          900: "var(--color-text-primary)",
          700: "var(--color-text-secondary)",
          400: "var(--color-text-muted)",
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      maxWidth: {
        'site': '1440px',
      },
      letterSpacing: {
        'editorial': '0.18em',
        'subtle': '0.08em',
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '6px',
        'md': '8px',
      },
      boxShadow: {
        'subtle': '0 2px 10px rgba(0, 0, 0, 0.04)',
        'lift': '0 12px 24px -6px rgba(0, 0, 0, 0.06)',
        'drawer': '-8px 0 24px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
