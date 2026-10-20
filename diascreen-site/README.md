# DiaScreen site

A Jekyll site for GitHub Pages: a homepage that presents the five screening modules, plus the
DiaScreen app itself at `/app/`.

## Where things live

| To change… | Edit |
|---|---|
| Site name, your name, email, URL | `_config.yml` |
| A module card (title, summary, inputs, outputs, guideline) | `_data/tools.yml` |
| Homepage wording and sections | `index.html` |
| Header, footer, `<head>` tags | `_layouts/base.html` |
| Look and feel | `assets/site.css` |
| Theme toggle and search | `assets/site.js` |
| The app (screening logic, forms, report) | `app/index.html` |

The cards, search and 404 page are generated from `_data/tools.yml`, so a module is written once.

## Publish

1. Put this folder at the root of a repo named `<username>.github.io`.
2. In Settings, Pages, deploy from the `main` branch.
3. In `_config.yml` set `url: https://<username>.github.io` and fill in `author`.

## Preview locally

```sh
bundle install
bundle exec jekyll serve   # http://localhost:4000
```

## Before real clinical use

The app has a hard-coded demo login (`clinician` / `screen2026`) that anyone can read in the page
source. It is not authentication. Patient records live only in the browser (`localStorage`), so do not
enter identifiable data on shared devices. A clinical deployment needs individual accounts,
encrypted storage, audit logs and regulatory approval.
