/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
      container: {
        center: true,
        padding: '1rem',
        screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' },
      },
      extend: {
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
          secondary:{ DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
          accent:   { DEFAULT: 'hsl(var(--accent))',   foreground: 'hsl(var(--accent-foreground))' },
          destructive:{DEFAULT:'hsl(var(--destructive))', foreground:'hsl(var(--destructive-foreground))'},
          muted:    { DEFAULT: 'hsl(var(--muted))',    foreground: 'hsl(var(--muted-foreground))' },
          card:     { DEFAULT: 'hsl(var(--card))',     foreground: 'hsl(var(--card-foreground))' },
          success: 'hsl(var(--success))',
          warning: 'hsl(var(--warning))',
          info: 'hsl(var(--info))',
        },
        borderRadius: {
          xl: 'var(--radius)',
          '2xl': 'calc(var(--radius) + 4px)',
          '3xl': 'calc(var(--radius) + 8px)',
        },
        boxShadow: {
          card: '0 2px 12px -2px rgb(0 0 0 / 0.08)',
        },
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
          mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        },
        transitionTimingFunction: { standard: 'cubic-bezier(0.2, 0, 0, 1)' },
        transitionDuration: { fast: '150ms', base: '250ms', slow: '400ms' },
        ringWidth: { 3: '3px' },
      },
    },
    plugins: [],
  }
  