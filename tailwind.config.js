/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          50: '#f0f1f5',
          100: '#d9dbe3',
          200: '#b3b7c7',
          300: '#8d93ab',
          400: '#676f8f',
          500: '#414b73',
          600: '#343c5c',
          700: '#272d45',
          800: '#1a1e2e',
          900: '#0d0f17',
          950: '#06070b',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: '#4f46e5',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
