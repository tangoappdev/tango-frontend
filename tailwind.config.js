/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme'); // Import the default theme

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Set 'sans' to use our Quicksand variable, with fallback fonts
        sans: ['var(--font-quicksand)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};