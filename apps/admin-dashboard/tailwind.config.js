/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#FF6B00', 50: '#FFF0E6', 100: '#FFD4AD', 500: '#FF6B00', 600: '#E05F00', 700: '#C25200' },
        dark: '#1A1A2E',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
    },
  },
  plugins: [],
};
