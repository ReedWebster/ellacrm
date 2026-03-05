/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light mode palette
        blush: {
          50:  '#fdf6f8',
          100: '#fce8ef',
          200: '#f9d1df',
          300: '#f4afc0',
          400: '#ed86a0',
          500: '#e8829a',
          600: '#d4607a',
          700: '#b8455f',
          800: '#9b3049',
          900: '#7a2038',
        },
        rose: {
          50:  '#fff1f3',
          100: '#fce8ef',
          200: '#f9c6d5',
          300: '#f4afc0',
          400: '#ed86a0',
          500: '#e8829a',
          600: '#d4607a',
          700: '#b8455f',
          800: '#9b3049',
          900: '#7a2038',
        },
        plum: {
          50:  '#f9eaf0',
          100: '#f2d4e3',
          200: '#e5a9c7',
          300: '#d47da9',
          400: '#c4568e',
          500: '#b05070',
          600: '#9e4060',
          700: '#7a3049',
          800: '#3d1a26',
          900: '#1e1017',
        },
        mauve: {
          100: '#f9eaf0',
          200: '#e8d0db',
          300: '#c9a8b8',
          400: '#9e7080',
          500: '#7a5060',
          600: '#5a3848',
          700: '#3d1a26',
          800: '#2e1822',
          900: '#1e1017',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
