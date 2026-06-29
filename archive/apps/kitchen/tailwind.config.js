/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        theme: {
          primary: '#E23744',
          'primary-light': '#F05A65',
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          'text-main': 'var(--color-text-main)',
          'text-sec': 'var(--color-text-sec)',
          accent: '#24963F',
          border: 'var(--color-border)',
        },
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-text-main)',
        secondary: 'var(--color-text-sec)',
        accent: '#24963F',
        accentPress: '#1e7b33',
        danger: '#E23744',
        success: '#24963F',
      },
      boxShadow: {
        'soft': '8px 8px 16px #080c17, -8px -8px 16px #16223d',
        'soft-sm': '4px 4px 8px #080c17, -4px -4px 8px #16223d',
        'inset': 'inset 4px 4px 8px #080c17, inset -4px -4px 8px #16223d',
        'inset-sm': 'inset 2px 2px 4px #080c17, inset -2px -2px 4px #16223d',
      },
      keyframes: {
        pulseLight: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .5 },
        }
      },
      animation: {
        pulseLight: 'pulseLight 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
