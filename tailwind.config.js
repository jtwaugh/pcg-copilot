/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html', // Tailwind will scan your HTML files for classes
    './static/js/**/*.js' // If you're using Tailwind in JS files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
