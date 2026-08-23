/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './client/src/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        foreground: '#fafafa',
        card: '#111827',
        primary: '#a855f7',
        secondary: '#6b7280',
        muted: '#737373',
        accent: '#e9d8fd',
      },
      borderRadius: {
        lg: 'var(--radius)',
      },
    },
  },
  plugins: [],
};
