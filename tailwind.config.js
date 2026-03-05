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
        blush: {
          50:  '#fdf4f7',
          100: '#fce8ef',
          200: '#f9d0e2',
          300: '#f2abc4',
          400: '#e980a4',
          500: '#de6690',
          600: '#c94f79',
          700: '#a83d62',
          800: '#8a2f50',
          900: '#6b2040',
        },
        plum: {
          50:  '#faf0f4',
          100: '#f3dde7',
          200: '#e8bdd0',
          300: '#d794b0',
          400: '#c46e93',
          500: '#b05578',
          600: '#964460',
          700: '#783449',
          800: '#3d1a28',
          900: '#1e0f16',
        },
        mauve: {
          100: '#f8eaf2',
          200: '#e8d2df',
          300: '#c9acbe',
          400: '#a07f94',
          500: '#7d5e72',
          600: '#5e4257',
          700: '#432038',
          800: '#2e1828',
          900: '#1a0f18',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        'modal':   '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
