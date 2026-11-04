# Deploying to GitHub Pages, step by step

This assumes you haven't created the GitHub repo yet.

## 1. Create the repository

1. Go to <https://github.com/new> while signed in as **JavadMaheri**.
2. Repository name: **`javadmaheri.github.io`** — this exact name (your GitHub username + `.github.io`) is what makes GitHub Pages serve it at the root of `https://javadmaheri.github.io`, with no extra path.
3. Visibility: **Public** (required for free GitHub Pages on a personal account).
4. Do **not** initialize with a README, .gitignore, or license — this repo already has its own files.
5. Click **Create repository**.

## 2. Push this code

From this folder (`site/`) in a terminal:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/JavadMaheri/javadmaheri.github.io.git
git push -u origin main
```

If prompted for credentials, use a [personal access token](https://github.com/settings/tokens) as the password (GitHub no longer accepts account passwords over HTTPS git), or push over SSH if you have a key set up.

## 3. Turn on GitHub Pages with the Actions build

1. On GitHub, go to the repo → **Settings** → **Pages** (left sidebar, under "Code and automation").
2. Under **Build and deployment** → **Source**, choose **GitHub Actions** (not "Deploy from a branch" — this repo ships its own pinned-version workflow at `.github/workflows/deploy.yml`, which needs "GitHub Actions" selected here to run).
3. That's it — no further config needed on this screen. The workflow runs automatically because it's already in the repo.

## 4. Watch the first deployment

1. Go to the **Actions** tab of the repo. You should see a run of "Build and deploy to GitHub Pages" (triggered by your push in step 2).
2. Wait for both jobs (`build` then `deploy`) to show green checkmarks — usually 1–2 minutes.
3. If it fails: click into the run, open the failing step's log. Most likely cause is a YAML/Liquid syntax error in a page you edited — the error message names the file and line.

## 5. Visit the site

<https://javadmaheri.github.io> should now be live. If you see a 404, wait a minute and refresh — the first deploy can take a moment to propagate.

## 6. Every future update

Just `git push` to `main`. The Actions workflow rebuilds and redeploys automatically — no manual step.

---

## Later: switching to a custom domain

When you're ready to move off `javadmaheri.github.io`:

1. In `_config.yml`, change the `url:` line (it has a comment marking this spot) to your custom domain, e.g. `url: https://javadmaheri.com`. Leave `baseurl:` as `""`.
2. Create a file named exactly `CNAME` (no extension) in the repo root, containing just your domain on one line, e.g.:
   ```
   javadmaheri.com
   ```
3. On your domain registrar, point DNS at GitHub Pages — either an `A` record for an apex domain (GitHub's current IPs are in [their docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)) or a `CNAME` record for a subdomain like `www`.
4. In repo Settings → Pages → **Custom domain**, enter the domain and save. GitHub will verify DNS and can auto-provision HTTPS (check "Enforce HTTPS" once available).
5. Commit and push both changes (`_config.yml` and the new `CNAME` file).
