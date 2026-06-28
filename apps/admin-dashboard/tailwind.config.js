/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B6B2F', 50: '#E8F5E9', 100: '#C8E6C9', 500: '#1B6B2F', 600: '#145224', 700: '#0D3A19' },
        dark: '#0D1F13',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      animation: { 'slide-in': 'slideIn 0.25s ease-out' },
      keyframes: { slideIn: { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } } },
    },
  },
  plugins: [],
};
