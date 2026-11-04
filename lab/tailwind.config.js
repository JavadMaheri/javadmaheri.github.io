/** Tailwind config for the /lab/ landing page only (built by `npm run build:lab`). */
module.exports = {
  content: ["./lab/src/**/*.jsx"],
  theme: {
    extend: {
      // "Chalkboard" palette: slate ink, chalk-white text, chalk-yellow accent.
      // Keep in sync with INK / CHALK / ACCENT in lab/src/app.jsx.
      colors: {
        black: "#1c2226",
        white: "#edebe4",
        accent: "#f0cb5a",
      },
      fontFamily: {
        heading: ["'Instrument Serif'", "serif"],
        body: ["'Barlow'", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "9999px",
      },
    },
  },
  corePlugins: {
    preflight: true,
  },
};
