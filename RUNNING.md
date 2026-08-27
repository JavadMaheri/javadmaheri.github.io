# Running, building, and version pinning

## Why versions are pinned

`Gemfile` pins exact versions (Jekyll 4.4.1, jekyll-feed 0.17.0, jekyll-sitemap 1.4.0, jekyll-redirect-from 0.16.0, jemoji 0.13.0 — current as of August 2026), and `.github/workflows/deploy.yml` pins Ruby to `3.3`. This site does **not** use the `github-pages` gem, so it is not tied to whatever Jekyll/plugin versions GitHub's own build image happens to run this month — it builds with exactly these versions until you deliberately change them. That's the tradeoff for "won't silently break in six months": you control updates instead of inheriting them.

To bump a version later: edit the number in `Gemfile` and/or `ruby-version` in the workflow, run `bundle update <gem>` locally, confirm `bundle exec jekyll build` still succeeds, then commit.

## Local setup (one-time)

You need Ruby (3.1 or newer; 3.3 recommended to match CI) and Bundler.

**Windows:** install [RubyInstaller with DevKit](https://rubyinstaller.org/downloads/) (pick the "WITH DEVKIT" version), then in a new terminal:

```bash
gem install bundler
```

**macOS:** `brew install ruby` (don't rely on the system Ruby), then `gem install bundler`.

**Linux:** install via your package manager or [rbenv](https://github.com/rbenv/rbenv), then `gem install bundler`.

Then, from the repo root:

```bash
bundle install
```

This reads `Gemfile`, installs the pinned gem versions, and writes `Gemfile.lock` (commit that file once it's generated — it locks the exact dependency graph, not just the top-level versions).

## Local preview

```bash
bundle exec jekyll serve
```

Open <http://localhost:4000>. It rebuilds on save; if you edit `_config.yml`, stop (`Ctrl+C`) and restart the server — Jekyll only reads that file at startup.

For a preview that also reaches other devices on your network:

```bash
bundle exec jekyll serve -H 0.0.0.0
```

## Production build (no server)

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

Output goes to `_site/`. This is what CI runs before publishing (see `.github/workflows/deploy.yml`); you shouldn't normally need to run it by hand except to sanity-check before pushing.

## Optional: Docker instead of installing Ruby

```bash
docker compose up
```

Uses `Dockerfile` / `docker-compose.yaml` (already in the repo) to run the same `jekyll serve` in a container. Preview at <http://localhost:4000>.

## Sanity checks before pushing

- `bundle exec jekyll build --strict_front_matter` — fails loudly on malformed YAML front matter (the CI workflow doesn't currently pass this flag, but running it locally catches mistakes early).
- Click through all five nav pages plus `/publications/`'s individual paper permalinks, and check `/research/` still loads at its direct URL even though nothing links to it.
- View source on `/research/` and confirm `<meta name="robots" content="noindex, nofollow">` is present in `<head>`.
