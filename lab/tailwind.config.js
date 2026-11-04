/** Tailwind config for the /lab/ site only (built by `npm run build:lab`). */
module.exports = {
  content: ["./lab/src/**/*.jsx"],
  theme: {
    extend: {
      // Theme-aware colors: the values are CSS variables defined per theme in
      // lab/src/styles.css. `black` is the page ground, `white` the ink.
      colors: {
        black: "rgb(var(--ink) / <alpha-value>)",
        white: "rgb(var(--chalk) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
      },
      fontFamily: {
        heading: ["'Newsreader'", "Georgia", "'Times New Roman'", "serif"],
        body: ["'IBM Plex Sans'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "'SFMono-Regular'", "Menlo", "monospace"],
      },
      borderRadius: {
        DEFAULT: "9999px",
      },
    },
  },
};
