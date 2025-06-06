// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ──────────────────────────────────────────────────────────────────────
        // LifeRamp 360 blues & greens (example hex values—adjust to match)
        // ──────────────────────────────────────────────────────────────────────
        "lr-blue-50": "#E6F4F9",
        "lr-blue-100": "#BFE6F3",
        "lr-blue-200": "#99D7ED",
        "lr-blue-300": "#4EBEE0",
        "lr-blue-400": "#0095D2",
        "lr-blue-500": "#007FB8", // primary blue
        "lr-blue-600": "#006699",
        "lr-blue-700": "#004C6B",
        "lr-blue-800": "#00344A",
        "lr-blue-900": "#001C29",

        "lr-green-50": "#E9F9F2",
        "lr-green-100": "#C4F1E1",
        "lr-green-200": "#9DE8D0",
        "lr-green-300": "#3FD4AD",
        "lr-green-400": "#00C58F",
        "lr-green-500": "#00A36F", // primary green
        "lr-green-600": "#008658",
        "lr-green-700": "#005C3B",
        "lr-green-800": "#003F2B",
        "lr-green-900": "#001F16",
      },
      fontFamily: {
        // Register the custom names we used in @font-face
        hero: ["HeroNew", "ui-serif", "Georgia"],
        spirit: ["NewSpirit", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        // ──────────────────────────────────────────────────────────────────────
        // Pre‐define any /images/* backgrounds you want quick classes for
        // ──────────────────────────────────────────────────────────────────────
        "hero-liferamp": "url('/images/LifeRamp_LifeRamp.jpg')",
        "assess-liferamp": "url('/images/LifeRamp_Assessment.jpg')",
        "connect-liferamp": "url('/images/LifeRamp_Connect.jpg')",
        "insights-liferamp": "url('/images/LifeRamp_Insights and Analytics.jpg')",
      },
    },
  },
  plugins: [],
};
