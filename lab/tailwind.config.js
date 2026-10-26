/** Tailwind config for the /lab/ landing page only (built by `npm run build:lab`). */
module.exports = {
  content: ["./lab/src/**/*.jsx"],
  theme: {
    extend: {
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
