/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        dean: {
          50: '#fbf6ed',
          100: '#f3e4c8',
          200: '#e6c896',
          300: '#d4a45c',
          400: '#bf8632',
          500: '#a06a1e',
          600: '#825416',
          700: '#65410f',
          800: '#482e0a',
          900: '#2c1b05'
        },
        cream: '#faf5ed'
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      }
    }
  },
  plugins: []
};
