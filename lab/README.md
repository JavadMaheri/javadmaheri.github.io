# The new design (`/lab/`)

A self-contained site that lives next to the classic Jekyll theme. It never
links into the classic pages, so the classic site can be removed without
breaking it.

## Pages

| URL | File |
|---|---|
| `/lab/` | `lab/index.html` |
| `/lab/research/allocation/` | `lab/research/allocation/index.html` |
| `/lab/research/hypergraph-partitioning/` | `lab/research/hypergraph-partitioning/index.html` |
| `/lab/research/graph-learning/` | `lab/research/graph-learning/index.html` |

Every page is a few lines of front matter around `_includes/lab-shell.html`.
All of them load the same bundle (`lab/app.js`, `lab/app.css`, `lab/fonts/`),
and the shell's `data-page` / `data-topic` attributes pick what to render.

## Editing

Content and components are in `lab/src/app.jsx` (research-page text is in
`TOPICS`, papers in `PUBS`, news in `NEWS`). After editing, rebuild and
commit the output:

```sh
npm install --no-save react@18.3.1 react-dom@18.3.1 framer-motion@11.11.17 tailwindcss@3.4.17 esbuild@0.24.2
npm run build:lab
```

To add a research page: add an entry to `TOPICS` and `TOPIC_ORDER`, give
papers that belong to it a matching `topic`, add a card to `CARDS`, and copy
one of the `lab/research/*/index.html` files with the new slug.

## Shared files it still uses

`files/javad-maheri-cv.pdf` and `images/favicon.svg`. Keep both if the
classic site is removed.

## Making it the homepage (and removing the classic site)

1. In `_config.yml`, set `lab_home: "/"` and `lab_noindex: false`.
2. In `lab/index.html`, change `permalink: /lab/` to `permalink: /`, and set
   `sitemap: true` here and in the research pages.
3. Delete the classic homepage, `_pages/about.md` (it also claims `/`).
4. Optionally delete the rest of the classic site: `_pages/`, `_publications/`,
   `_layouts/`, `_sass/`, `_data/`, `assets/` and the theme includes in
   `_includes/` (keep `lab-shell.html`), then add a simple `404.html`.

Research pages stay at `/lab/research/…`; only the home page moves.
