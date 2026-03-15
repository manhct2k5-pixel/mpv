/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8a5b3f',
          dark: '#6f442e',
          light: '#f2e5d7'
        },
        cream: '#f7efe6',
        latte: '#e8d4bf',
        caramel: '#d2a57b',
        blush: '#f1c6b1',
        cocoa: '#3b2a21',
        mocha: '#8a5b3f'
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'sans-serif'],
        display: ['"Be Vietnam Pro"', 'sans-serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif']
      }
    }
  },
  plugins: []
};
