# Deployment Guide

`stashd` is a zero-dependency static site (HTML + CSS + vanilla ES modules). It runs anywhere that can serve static files.

---

## Option A — GitHub Pages (recommended)

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that deploys to GitHub Pages automatically on every push to `main`.

### First-time setup

1. Push the repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select **GitHub Actions**.
4. The first deployment triggers automatically on the next push to `main`.
5. Your archive will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

### Manual trigger

You can also trigger a deployment manually from **Actions → Deploy to GitHub Pages → Run workflow**.

---

## Option B — Local development

Because the app uses ES modules (`type="module"` script), it **cannot be opened directly as a `file://` URL** — browsers block module imports in that context.

Use any simple HTTP server:

```bash
# Python (built-in, no install needed)
python3 -m http.server 8080

# Node.js (npx, no install needed)
npx serve .

# Node.js (http-server)
npx http-server . -p 8080 -c-1
```

Then open `http://localhost:8080` in your browser.

---

## Option C — Netlify / Vercel

Both platforms detect static sites automatically.

**Netlify (drag and drop)**
1. Go to [app.netlify.com](https://app.netlify.com).
2. Drag the entire project folder onto the deploy zone.
3. Done. Netlify gives you a public URL immediately.

**Netlify (Git)**
1. Connect the GitHub repo.
2. Build command: *(leave blank)*
3. Publish directory: `.` (root)
4. Deploy.

**Vercel**
1. Connect the GitHub repo at [vercel.com](https://vercel.com).
2. Framework preset: **Other**.
3. Output directory: `.` (root)
4. Deploy.

---

## Option D — Self-hosted (Nginx / Caddy)

```nginx
# nginx example
server {
    listen 80;
    server_name archive.yourdomain.com;
    root /var/www/stashd;
    index index.html;
    location / {
        try_files $uri $uri/ =404;
    }
}
```

```caddy
# Caddyfile example
archive.yourdomain.com {
    root * /var/www/stashd
    file_server
}
```

---

## Data persistence note

All story data is stored in **localStorage** in the browser that opens the app. This means:

- Data is **per-device / per-browser** — not shared across devices automatically.
- Clearing browser data or using a different browser will show an empty archive.
- Use **Settings → Export JSON backup** to save a portable copy of your data, and **Import JSON backup** to restore it on another device.

For multi-device sync, consider:
- Storing the exported JSON in a private GitHub Gist or repo and manually importing/exporting.
- Replacing `storage.js` with a backend (Supabase, PocketBase, etc.) — see `storage.js` for the interface to implement.

---

## Environment summary

| Requirement | Value |
|---|---|
| Server-side runtime | None |
| Build step | None |
| Dependencies | None (zero `npm install`) |
| Browser support | Any modern browser (ES2020+) |
| HTTPS required for Discord | Yes — Discord webhooks require HTTPS in production |
