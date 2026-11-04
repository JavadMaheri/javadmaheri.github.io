/** Tailwind config for the main site in site/ (built by `npm run build:site`). */
module.exports = {
  content: ["./site/src/**/*.jsx"],
  theme: {
    extend: {
      // Theme-aware colors: the values are CSS variables defined per theme in
      // site/src/styles.css. `black` is the page ground, `white` the ink.
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
