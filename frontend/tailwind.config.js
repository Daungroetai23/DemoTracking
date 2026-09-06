/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f5ff',
          100: '#e1ebff',
          200: '#cbdcff',
          300: '#a3c2ff',
          400: '#759eff',
          500: '#4771fa',
          600: '#2e4ef2',
          700: '#233bdc',
          800: '#2131b2',
          900: '#202d8d',
          950: '#141a56',
        }
      }
    },
  },
  plugins: [],
}
