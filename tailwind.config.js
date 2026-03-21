/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(210, 20%, 98%)',
        foreground: 'hsl(220, 20%, 10%)',
        primary: {
          DEFAULT: 'hsl(142, 76%, 36%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        secondary: {
          DEFAULT: 'hsl(210, 16%, 93%)',
          foreground: 'hsl(220, 20%, 20%)',
        },
        muted: {
          DEFAULT: 'hsl(210, 16%, 93%)',
          foreground: 'hsl(220, 10%, 46%)',
        },
        accent: {
          DEFAULT: 'hsl(24, 95%, 53%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        destructive: {
          DEFAULT: 'hsl(0, 84%, 60%)',
          foreground: 'hsl(0, 0%, 98%)',
        },
        border: 'hsl(214, 20%, 88%)',
        card: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          foreground: 'hsl(220, 20%, 10%)',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '10px',
        sm: '8px',
      },
    },
  },
  plugins: [],
};
