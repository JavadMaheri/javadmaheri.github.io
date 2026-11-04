# The main site (`site/`)

The homepage and research pages are a small React app built from this
folder. The older Jekyll theme pages live under `/lab/` as a text-only
version and are kept out of search results.

## Pages

| URL | File |
|---|---|
| `/` | `site/index.html` |
| `/research/allocation/` | `site/research/allocation/index.html` |
| `/research/hypergraph-partitioning/` | `site/research/hypergraph-partitioning/index.html` |
| `/research/graph-learning/` | `site/research/graph-learning/index.html` |

Every page is a few lines of front matter around `_includes/site-shell.html`.
All of them load the same files from `/site/` (`app.js`, `app.css`,
`fonts/`, `images/`), and the shell's `data-page` / `data-topic` attributes
pick what to render.

## Editing

Content and components are in `site/src/app.jsx`: research-page text in
`TOPICS`, papers in `PUBS`, news in `NEWS`, coursework in `COURSEWORK`,
experience in `ROLES`, `EARLIER` and `TEACHING`. Colours and fonts are in
`site/src/styles.css` and `site/tailwind.config.js`. After editing, rebuild
and commit the output:

```sh
npm install --no-save react@18.3.1 react-dom@18.3.1 framer-motion@11.11.17 tailwindcss@3.4.17 esbuild@0.24.2
npm run build:site
```

To add a research page: add an entry to `TOPICS` and `TOPIC_ORDER`, give
papers that belong to it a matching `topic`, add a card to `CARDS`, and copy
one of the `site/research/*/index.html` files with the new slug.

## Shared files

`files/javad-maheri-cv.pdf` (the downloadable CV) and `images/favicon.svg`.

## The classic pages under `/lab/`

They are the Jekyll theme pages in `_pages/` and `_publications/`. Their old
addresses (`/publications/`, `/resume/`, `/cv/`, `/research/`,
`/publication/...`) redirect to the `/lab/` versions. To remove them, delete
`_pages/` (keep `404.md` or add a plain `404.html`), `_publications/`,
`_includes/work-experience-body.md` and the theme folders, and the main site
keeps working.
