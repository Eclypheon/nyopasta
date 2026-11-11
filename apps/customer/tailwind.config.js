/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          DEFAULT: '#E2583E',
          50: '#FDF4F2',
          100: '#FCE7E4',
          500: '#E2583E',
          600: '#CE452C',
          700: '#B03620',
        },
        cream: {
          DEFAULT: '#FAF4E8',
          light: '#FFFDF9',
          dark: '#EFE7D5',
        },
        navy: {
          DEFAULT: '#172554',
          900: '#0F172A',
        },
        pasta: {
          gold: '#EAB308',
          light: '#FEF08A',
        },
      },
    },
  },
  plugins: [],
};
