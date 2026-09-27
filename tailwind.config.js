/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        paper: "#f6f8fb",
        brand: "#2563eb",
        accent: "#7c3aed"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(16, 32, 51, 0.10)"
      }
    }
  },
  plugins: []
};
