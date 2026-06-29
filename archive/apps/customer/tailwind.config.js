/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        theme: {
          primary: '#E23744',
          'primary-light': '#F05A65',
          bg: '#F8F9FA',
          surface: '#FFFFFF',
          'text-main': '#1C1C1C',
          'text-sec': '#696969',
          accent: '#24963F',
        },
        background: '#f8fafc', // slate-50
        surface: '#ffffff',
        primary: '#0f172a', // slate-900
        secondary: '#64748b', // slate-500
        accent: '#3b82f6', // blue-500
        accentPress: '#2563eb', // blue-600
        danger: '#ef4444', // red-500
        success: '#22c55e', // green-500
      },
      boxShadow: {
        'soft': '8px 8px 16px #e2e8f0, -8px -8px 16px #ffffff',
        'soft-sm': '4px 4px 8px #e2e8f0, -4px -4px 8px #ffffff',
        'inset': 'inset 4px 4px 8px #e2e8f0, inset -4px -4px 8px #ffffff',
        'inset-sm': 'inset 2px 2px 4px #e2e8f0, inset -2px -2px 4px #ffffff',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        }
      },
      animation: {
        slideUp: 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        slideDown: 'slideDown 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        fadeOut: 'fadeOut 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}
