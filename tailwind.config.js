/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0C447C',
        'navy-hover': '#0F5A99',
        'navy-accent': '#85B7EB',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
