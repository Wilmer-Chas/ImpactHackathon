/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#4F46E5",
        "brand-light": "#F3F4F6",
      },
    },
  },
  plugins: [],
};
