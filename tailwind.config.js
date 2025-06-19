/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          150: '#f7f8f9',
        },
        green: {
          150: '#f0f9f4',
        },
        yellow: {
          150: '#fefce8',
        },
        red: {
          150: '#fef2f2',
        },
      },
    },
  },
  plugins: [],
};