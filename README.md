# javadmaheri.github.io

Javad Maheri's academic/professional website. Built on [Academic Pages](https://github.com/academicpages/academicpages.github.io) (Jekyll), stripped down to five sections:

- **Home** (`/`) — `_pages/about.md`
- **Work Experience** (`/work-experience/`) — `_pages/work-experience.md`
- **Publications** (`/publications/`) — `_pages/publications.html`, data in `_publications/`
- **Contact** (`/contact/`) — `_pages/contact.md`
- **Resume** (`/resume/`) — `_pages/resume.md`, PDF in `files/javad-maheri-cv.pdf`

Plus one **unlisted** page, `/research/` (`_pages/research.md`) — not in navigation, not in the sitemap, `noindex`. Shared by direct link only. See its own comment block at the top of the file for how the exclusion is wired.

## Quickstart (local preview)

You need Ruby (3.1+) and Bundler. See [RUNNING.md](RUNNING.md) for install instructions and why the versions are pinned.

```bash
bundle install
bundle exec jekyll serve
```

Then open <http://localhost:4000>.

## Deploying

Push to `main` — a GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the site and publishes it to GitHub Pages automatically. First-time repo setup and Pages configuration: see [DEPLOY.md](DEPLOY.md).

## Editing content

| To change...                          | Edit...                                                              |
|----------------------------------------|-----------------------------------------------------------------------|
| Name, bio, social links (sidebar)      | `_config.yml` (`author:` block)                                       |
| Nav menu                               | `_data/navigation.yml`                                                |
| Home page text                         | `_pages/about.md`                                                     |
| Work experience                        | `_includes/work-experience-body.md` (shared by Work Experience + Resume) |
| A publication                          | `_publications/*.md` (one file per paper; shown on Publications, Home, Resume, and /research/ automatically) |
| Add a new publication                  | Copy an existing file in `_publications/`, edit the front matter      |
| Resume text (non-shared parts)         | `_pages/resume.md`                                                     |
| CV PDF                                 | Replace `files/javad-maheri-cv.pdf` (keep the filename, or update the link in `_pages/resume.md`) |
| Unlisted research profile              | `_pages/research.md`                                                   |
| Profile photo                          | Replace `images/profile.png` (same filename), or change `author.avatar` in `_config.yml` |

## Outstanding TODOs

Search the repo for `TODO(user)` — every placeholder, unresolved conflict between your two CVs, and missing input (Google Scholar / ORCID / arXiv / LinkedIn URLs, thesis jury, `/research/` current-directions text, talks & service) is marked at its exact location. Key ones:

- `_config.yml` — `author:` block: `googlescholar`, `orcid`, `arxiv`, `linkedin` are blank.
- `_includes/work-experience-body.md` — the "Zarebin" employer conflicts with what one of your two source CVs says; resolve and it propagates to both Work Experience and Resume automatically.
- `_publications/2026-01-01-universal-optimal-allocation.md` — publication status conflicts across sources; confirm the true current status.
- `_pages/research.md` — thesis jury, "Current directions", and "Talks and service" are all placeholders awaiting your input.
- `images/profile.png` — currently the template's placeholder image.

## Switching to a custom domain later

One-line change: in `_config.yml`, update the `url:` line (marked with a comment) to your domain, then add a `CNAME` file in the repo root containing just that domain, and set it under repo Settings → Pages → Custom domain. Full steps in [DEPLOY.md](DEPLOY.md).
