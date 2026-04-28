/**
 * discord.js
 * Discord webhook integration for stashd.
 *
 * Discord webhook docs: https://discord.com/developers/docs/resources/webhook
 *
 * Usage:
 *   import { postStory, postDigest, testWebhook } from './discord.js';
 */

// ─── Colour for the embed left-bar (hex integer) ──────────────────────────────
const EMBED_COLOR = 0x1a1a2e; // dark navy

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Send a raw payload to a Discord webhook URL.
 * @param {string} webhookUrl
 * @param {object} payload  Discord webhook body.
 * @returns {Promise<Response>}
 */
async function sendToWebhook(webhookUrl, payload) {
  if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
    throw new Error('Invalid webhook URL. Must start with https://discord.com/api/webhooks/');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Discord API error ${res.status}: ${body}`);
  }

  return res;
}

// ─── Story → Discord embed ────────────────────────────────────────────────────

/**
 * Convert a Story object into a Discord embed object.
 * @param {import('./storage.js').Story} story
 * @returns {object} Discord embed.
 */
function storyToEmbed(story) {
  const embed = {
    color: EMBED_COLOR,
    title: story.title,
    description: story.summary || null,
    timestamp: new Date(story.date).toISOString(),
    footer: { text: 'Stashd' },
    fields: [],
  };

  if (story.url) {
    embed.url = story.url;
  }

  if (story.source) {
    embed.fields.push({ name: 'Source', value: story.source, inline: true });
  }

  if (story.tags && story.tags.length > 0) {
    embed.fields.push({
      name: 'Tags',
      value: story.tags.map(t => `\`${t}\``).join(' '),
      inline: true,
    });
  }

  return embed;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Post a single story to Discord as a rich embed.
 * @param {string} webhookUrl
 * @param {import('./storage.js').Story} story
 * @param {object} [opts]
 * @param {string} [opts.username]   Override bot display name.
 * @param {string} [opts.avatarUrl]  Override bot avatar URL.
 * @returns {Promise<void>}
 */
export async function postStory(webhookUrl, story, opts = {}) {
  const payload = {
    username:   opts.username   || 'Stashd',
    avatar_url: opts.avatarUrl  || undefined,
    embeds: [storyToEmbed(story)],
  };

  await sendToWebhook(webhookUrl, payload);
}

/**
 * Post a digest of multiple stories as a single Discord message.
 * Max 10 embeds per webhook call (Discord limit).
 * @param {string} webhookUrl
 * @param {import('./storage.js').Story[]} stories  Array of stories to include.
 * @param {object} [opts]
 * @param {string} [opts.username]
 * @param {string} [opts.avatarUrl]
 * @param {string} [opts.label]  Optional digest label (e.g. "Weekly Digest").
 * @returns {Promise<void>}
 */
export async function postDigest(webhookUrl, stories, opts = {}) {
  if (!stories.length) throw new Error('No stories to post.');

  const chunks = chunkArray(stories.slice(0, 10), 10);

  for (const chunk of chunks) {
    const payload = {
      username:   opts.username  || 'Stashd',
      avatar_url: opts.avatarUrl || undefined,
      content:    opts.label ? `**${opts.label}** — ${chunk.length} entr${chunk.length === 1 ? 'y' : 'ies'}` : undefined,
      embeds:     chunk.map(storyToEmbed),
    };

    await sendToWebhook(webhookUrl, payload);
  }
}

/**
 * Post a plain-text digest (no embeds) — useful for channels that prefer text.
 * Discord message limit is 2000 chars; this truncates gracefully.
 * @param {string} webhookUrl
 * @param {import('./storage.js').Story[]} stories
 * @param {object} [opts]
 * @param {string} [opts.username]
 * @returns {Promise<void>}
 */
export async function postTextDigest(webhookUrl, stories, opts = {}) {
  if (!stories.length) throw new Error('No stories to post.');

  const lines = ['**Stashd — story digest**', ''];
  for (let i = 0; i < Math.min(stories.length, 15); i++) {
    const s = stories[i];
    lines.push(`**${i + 1}. ${s.title}**`);
    if (s.url)     lines.push(`> <${s.url}>`);
    if (s.summary) lines.push(`> ${s.summary}`);
    if (s.tags.length) lines.push(`> ${s.tags.map(t => `\`${t}\``).join(' ')}`);
    lines.push('');
  }

  if (stories.length > 15) {
    lines.push(`_...and ${stories.length - 15} more_`);
  }

  let content = lines.join('\n');
  if (content.length > 1950) content = content.slice(0, 1950) + '\n_[truncated]_';

  await sendToWebhook(webhookUrl, {
    username: opts.username || 'Stashd',
    content,
  });
}

/**
 * Send a test message to verify the webhook URL is working.
 * @param {string} webhookUrl
 * @returns {Promise<void>}
 */
export async function testWebhook(webhookUrl) {
  await sendToWebhook(webhookUrl, {
    username: 'Stashd',
    content:  '✅ Webhook connected. `stashd` is ready to post.',
  });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

/**
 * Split an array into chunks of at most `size` elements.
 * @param {any[]} arr
 * @param {number} size
 * @returns {any[][]}
 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
