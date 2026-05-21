/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1A6B3C',
          light: '#74C69D',
          dark:  '#0F4526',
          accent:'#D8F3DC',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Raleway', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
