# Discord Integration Setup

This guide walks you through connecting `stashd` to a Discord channel via a webhook.

---

## What the integration does

| Feature | Description |
|---|---|
| **Post single story** | Tap the `↗` button on any card to post it as a rich Discord embed |
| **Post digest (embeds)** | Posts your current filtered view as rich embeds (max 10) |
| **Post digest (text)** | Posts a plain-text summary (max 15 stories, 2000 char limit) |
| **Copy for Discord** | Copies the formatted text to clipboard — paste it yourself |
| **Auto-post on save** | Automatically posts every new story the moment you save it |

---

## Step 1 — Create a webhook in Discord

1. Open Discord and go to the server where you want stories to be posted.
2. Right-click the target channel → **Edit Channel**.
3. Select **Integrations** → **Webhooks** → **New Webhook**.
4. Give it a name (e.g. `stashd`) and optionally set an avatar.
5. Click **Copy Webhook URL** — it will look like:
   ```
   https://discord.com/api/webhooks/1234567890/AbCdEfGhIjKlMnOpQrStUvWxYz
   ```
6. Keep this URL private — anyone with it can post to your channel.

---

## Step 2 — Add the webhook to the app

1. Open `stashd` in your browser.
2. Click **settings** (top right).
3. Paste your webhook URL into the **Webhook URL** field.
4. Optionally set a **bot display name** (shows as the sender in Discord).
5. Click **send test message** to verify it works — you should see a confirmation in your Discord channel.
6. Click **save settings**.

---

## Step 3 — Optional: auto-post

Enable **auto-post new stories to Discord on save** in settings to have every new archive entry posted to Discord automatically the moment you save it.

Useful for a personal `#resources` or `#writeups` channel where you want a running feed.

---

## Embed format

Each story posts as a Discord embed with:

- **Title** (linked to the URL if one is set)
- **Description** (your summary/notes)
- **Source** field (e.g. "HackTheBox", "Medium")
- **Tags** field (inline code style: `` `ctf` `` `` `web` ``)
- **Timestamp** (date you archived it)
- Dark navy left-bar colour (`#1a1a2e`)

Example embed appearance:

```
┌─────────────────────────────────────────┐
│ ██ Exploiting SSRF in AWS Metadata      │  ← title (clickable)
│    This writeup covers how to pivot     │  ← summary
│    from SSRF to full credential leak... │
│                                         │
│  Source          Tags                   │
│  HackTheBox      `ssrf` `aws` `cloud`  │
│                                         │
│                    16 Apr 2025          │  ← timestamp
│                  Stashd      │  ← footer
└─────────────────────────────────────────┘
```

---

## Discord limits

| Limit | Value |
|---|---|
| Embeds per webhook call | 10 |
| Message character limit | 2,000 |
| Webhook calls per 30s | ~5 (rate limited by Discord) |

The app handles these automatically — digest posts cap at 10 embeds, and text digests truncate at 2,000 characters.

---

## Security note

Your webhook URL is stored in `localStorage` (browser only — never sent to any server other than Discord). It is not included in JSON exports. Treat it like a password: don't commit it to a public repo or share it publicly.

To rotate a compromised webhook: Discord → Channel Settings → Integrations → Webhooks → select webhook → **Regenerate** or **Delete**.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Test message not appearing | Double-check the webhook URL was copied in full |
| `Discord API error 400` | Webhook URL may be malformed or the channel was deleted |
| `Discord API error 429` | Rate limited — wait 30 seconds and try again |
| CORS error in browser console | You're opening `index.html` from `file://` — serve it over HTTP (see [deployment.md](deployment.md)) |

---

## Future ideas

- [ ] **Slash command bot** — `/archive add <url>` from inside Discord  
- [ ] **Scheduled digests** — weekly `#resources` digest via cron or GitHub Actions  
- [ ] **Reaction-to-save** — react with an emoji in any channel to archive the linked story  
- [ ] **Forum thread per tag** — auto-post to a Discord forum channel, one thread per tag  
