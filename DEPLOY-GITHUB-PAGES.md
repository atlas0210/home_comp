# Deploy to GitHub Pages

This project is configured for automatic GitHub Pages deployment via:

- `.github/workflows/pages.yml`
- `index.html` (default site entry point)

## 1) Initialize git (first time only)

```bash
git init
git branch -M main
git add .
git commit -m "Setup Home Comparison dashboard for GitHub Pages"
```

## 2) Create an empty GitHub repo

Create a new repo on GitHub (no README/license), then copy its URL.

## 3) Push

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 4) Enable Pages in GitHub

In GitHub repo settings:

- Go to **Settings -> Pages**
- Under **Build and deployment**, set **Source** to **GitHub Actions**

The workflow will run on each push to `main` and publish the site.

## 5) Open on mobile

Use your Pages URL:

`https://<your-username>.github.io/<your-repo>/`

Notes:

- Data Entry edits are browser-local (`localStorage`) on each device.
- Use **Save Backup** in Data Entry to export and transfer data between devices.
