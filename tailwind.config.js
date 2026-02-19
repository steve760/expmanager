/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,css}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          muted: '#EDE9FE',
          light: '#A78BFA',
        },
        warm: {
          50: '#FAFAFF',
          100: '#F3F2FF',
          200: '#E9E8FF',
          300: '#D4D1F9',
        },
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#7C3AED',
        },
        sidebar: {
          DEFAULT: '#F5F3FF',
          hover: '#EDE9FE',
          border: '#E9E8FF',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        brand: ['Syne', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '2.5xl': '1.375rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.06), 0 4px 16px -4px rgba(0, 0, 0, 0.04)',
        'elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 16px 48px -8px rgba(0, 0, 0, 0.06)',
        'elevated-dark': '0 8px 24px -4px rgba(0, 0, 0, 0.35), 0 16px 48px -8px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 24px -4px rgba(124, 58, 237, 0.25)',
        'glow-dark': '0 0 20px -6px rgba(139, 92, 246, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-subtle': 'linear-gradient(135deg, #E6E7E9 0%, #E6E7E9 100%)',
        'gradient-subtle-dark': 'linear-gradient(135deg, #1c1917 0%, #292524 50%, #1c1917 100%)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(12px, -16px) scale(1.02)' },
          '66%': { transform: 'translate(-8px, 10px) scale(0.98)' },
        },
        'float-slower': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-15px, -10px) scale(1.03)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'float-slow': 'float-slow 12s ease-in-out infinite',
        'float-slower': 'float-slower 18s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
