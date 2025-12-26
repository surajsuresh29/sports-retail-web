/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#f59e0b", // Amber-500
        brand: "#fede00", // Yellow
        secondary: "#475569", // Slate-600
        accent: "#1e293b", // Slate-800 (Dark Accent for contrast against yellow)
        danger: "#ef4444", // Red-500
        success: "#22c55e", // Green-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
