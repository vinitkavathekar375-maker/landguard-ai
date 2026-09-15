/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f5fa',
          100: '#dce7f3',
          200: '#bccee4',
          300: '#92afd1',
          400: '#618bbb',
          500: '#4170a4',
          600: '#315786',
          700: '#28466d',
          800: '#1b3252',
          900: '#0f1f35',
          950: '#08111e',
        },
        risk: {
          low: '#10b981',
          med: '#f59e0b',
          high: '#ef4444',
          lowBg: '#ecfdf5',
          medBg: '#fffbeb',
          highBg: '#fef2f2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
