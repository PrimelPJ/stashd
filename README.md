# Stashd

Your personal story and link archive. Save writeups, articles, CTF solutions, talks, and resources — searchable, tagged, and postable to Discord — searchable, tagged, and postable to Discord.

**Live demo:** deploy to GitHub Pages in one push. Zero backend. Zero dependencies.

---

## Features

- **Archive stories** with title, URL, summary, tags, and source
- **Search** across all fields in real time
- **Filter by tag** — click any tag chip to narrow the view
- **Edit & delete** — full CRUD on every entry
- **Discord integration** — post individual stories or digests to a webhook as rich embeds or plain text; optional auto-post on save
- **Copy for Discord** — clipboard-ready formatted text, no webhook needed
- **Export / import** — portable JSON backup, merge-safe import (no duplicates by ID)
- **GitHub Pages ready** — ships with a working Actions workflow
- **No build step** — pure HTML + CSS + vanilla ES modules

---

## Screenshots

> _Add a screenshot here: `docs/screenshot.png`_

---

## Quick start

```bash
git clone https://github.com/<you>/stashd.git
cd stashd
python3 -m http.server 8080
# open http://localhost:8080
```

> **Why a server?** The app uses ES modules (`import`/`export`), which browsers block over `file://`. Any HTTP server works — Python's built-in one is fine for local use.

---

## Deployment

See [docs/deployment.md](docs/deployment.md) for full instructions. The short version:

| Platform | How |
|---|---|
| **GitHub Pages** | Push to `main` — the included Actions workflow auto-deploys |
| **Netlify** | Drag the folder onto the deploy zone, or connect the repo |
| **Vercel** | Connect the repo, set framework to "Other", output dir `.` |
| **Self-hosted** | Point Nginx / Caddy at the repo root |

---

## Discord integration

See [docs/discord-setup.md](docs/discord-setup.md) for the full walkthrough.

**Quick setup:**
1. Create a webhook in your Discord server (Channel Settings → Integrations → Webhooks).
2. Open the app → **settings** → paste the webhook URL → **save settings**.
3. Use the `↗` button on any card to post it, or use **post digest** in the toolbar.

**Auto-post:** enable in settings to have every new story automatically posted to Discord when saved.

---

## Project structure

```
stashd/
├── index.html                  # App shell — all markup lives here
├── css/
│   └── style.css               # All styles (dark theme, responsive)
├── js/
│   ├── app.js                  # Core: state, rendering, event handling
│   ├── storage.js              # localStorage abstraction + JSON import/export
│   └── discord.js              # Discord webhook client (embeds, digest, test)
├── docs/
│   ├── discord-setup.md        # Discord webhook setup walkthrough
│   └── deployment.md           # Hosting options and data persistence notes
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Pages CI/CD
```

---

## Module reference

### `js/storage.js`

Pure functions over `localStorage`. Replace this module to swap in a backend (Supabase, PocketBase, etc.).

| Export | Signature | Description |
|---|---|---|
| `loadStories` | `() → Story[]` | Load all stories |
| `saveStories` | `(Story[]) → void` | Overwrite full array |
| `addStory` | `(Story) → Story[]` | Prepend and persist |
| `deleteStory` | `(id) → Story[]` | Remove by ID |
| `updateStory` | `(id, patch) → Story[]` | Merge patch by ID |
| `loadSettings` | `() → Settings` | Load app settings |
| `saveSettings` | `(patch) → Settings` | Merge-save settings |
| `exportJSON` | `() → void` | Trigger backup download |
| `importJSON` | `(File) → Promise<number>` | Merge-import, returns added count |

**Story shape:**
```js
{
  id:      string,    // Date.now().toString()
  title:   string,    // required
  url:     string,
  summary: string,
  tags:    string[],
  source:  string,
  date:    string,    // "YYYY-MM-DD"
}
```

---

### `js/discord.js`

Discord webhook client. All functions are `async` and throw on API errors.

| Export | Description |
|---|---|
| `postStory(url, story, opts?)` | Post a single story as a rich embed |
| `postDigest(url, stories, opts?)` | Post up to 10 stories as embeds in one call |
| `postTextDigest(url, stories, opts?)` | Post up to 15 stories as plain text (≤ 2000 chars) |
| `testWebhook(url)` | Send a test confirmation message |

`opts` supports `username` (bot display name) and `avatarUrl`.

---

### `js/app.js`

Orchestrates the UI. Uses event delegation — all user interactions flow through a single `click` listener that reads `data-action` attributes. State is a plain object updated synchronously; DOM is re-rendered after each mutation.

---

## Data & privacy

- All data is stored in **`localStorage`** in your browser — nothing leaves your device except Discord posts.
- Webhook URLs are stored locally and never included in JSON exports.
- Clearing browser storage removes all data. Use **Export JSON** regularly as a backup.
- For multi-device access: export on one device, import on another.

---

## Roadmap / ideas

- [ ] Supabase backend for real multi-device sync
- [ ] Discord bot slash command: `/archive add <url>`
- [ ] Weekly digest via GitHub Actions scheduled cron
- [ ] Tag aliasing / merge
- [ ] Bulk import from browser bookmarks (HTML format)
- [ ] Markdown notes per story
- [ ] Story ratings / priority flags

---

## Contributing

Issues and PRs welcome. This is a personal tool but general improvements are appreciated.

```bash
git clone https://github.com/<you>/stashd.git
cd stashd
# No install step — edit and serve
python3 -m http.server 8080
```

---

## License

MIT — do whatever, attribution appreciated but not required.
