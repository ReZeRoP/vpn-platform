import type { Config } from 'tailwindcss';

// AMOLED-first design system. No light mode by design.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pure-black canvas layers
        void: '#000000',
        base: '#050505',
        surface: '#0b0b0d',
        elevated: '#141418',
        hairline: 'rgba(255,255,255,0.08)',
        // High-contrast neon accents
        neon: {
          blue: '#3b82f6',
          violet: '#8b5cf6',
          emerald: '#10b981',
        },
        muted: '#8a8a93',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(59,130,246,0.45)',
        'glow-emerald': '0 0 24px -4px rgba(16,185,129,0.45)',
      },
      backdropBlur: {
        glass: '14px',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
