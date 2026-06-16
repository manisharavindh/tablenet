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
      }
    },
  },
  plugins: [],
}
