import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          900: "#1e3a8a",
        },
        attendance: {
          present: "#059669", // Emerald
          late: "#d97706",    // Amber
          absent: "#e11d48",  // Rose
          unmarked: "#64748b",// Slate
        },
      },
    },
  },
  plugins: [],
};

export default config;
