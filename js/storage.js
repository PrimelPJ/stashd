/**
 * storage.js
 * localStorage abstraction for stashd.
 * All story data lives under STORIES_KEY.
 * Settings (Discord webhook, preferences) live under SETTINGS_KEY.
 */

const STORIES_KEY  = 'stashd_stories';
const SETTINGS_KEY = 'stashd_settings';

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * Load all stories from localStorage.
 * @returns {Story[]} Array of story objects, newest-first.
 */
export function loadStories() {
  try {
    const raw = localStorage.getItem(STORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[storage] Failed to load stories:', e);
    return [];
  }
}

/**
 * Persist the full stories array to localStorage.
 * @param {Story[]} stories
 */
export function saveStories(stories) {
  try {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  } catch (e) {
    console.error('[storage] Failed to save stories:', e);
    throw new Error('Storage quota exceeded or write failed.');
  }
}

/**
 * Add a single story (prepended so newest appears first).
 * @param {Story} story
 * @returns {Story[]} Updated array.
 */
export function addStory(story) {
  const stories = loadStories();
  stories.unshift(story);
  saveStories(stories);
  return stories;
}

/**
 * Delete a story by its id.
 * @param {string} id
 * @returns {Story[]} Updated array.
 */
export function deleteStory(id) {
  const stories = loadStories().filter(s => s.id !== id);
  saveStories(stories);
  return stories;
}

/**
 * Update an existing story in-place.
 * @param {string} id
 * @param {Partial<Story>} patch  Fields to merge in.
 * @returns {Story[]} Updated array.
 */
export function updateStory(id, patch) {
  const stories = loadStories().map(s => s.id === id ? { ...s, ...patch } : s);
  saveStories(stories);
  return stories;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * Default settings shape.
 * @returns {Settings}
 */
function defaultSettings() {
  return {
    discordWebhook: '',
    autoPost: false,       // post to Discord automatically on save
    webhookUsername: 'Stashd',
    webhookAvatarUrl: '',
  };
}

/**
 * Load app settings.
 * @returns {Settings}
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings(), ...JSON.parse(raw) } : defaultSettings();
  } catch (e) {
    return defaultSettings();
  }
}

/**
 * Save/merge settings.
 * @param {Partial<Settings>} patch
 * @returns {Settings} Full updated settings.
 */
export function saveSettings(patch) {
  const current = loadSettings();
  const updated  = { ...current, ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

// ─── Import / Export ──────────────────────────────────────────────────────────

/**
 * Export all data as a downloadable JSON file.
 * Filename: stashd-backup-YYYY-MM-DD.json
 */
export function exportJSON() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    stories: loadStories(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `stashd-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Import stories from a JSON backup file.
 * Merges by id (skips duplicates), returns count of newly added stories.
 * @param {File} file
 * @returns {Promise<number>} Count of stories imported.
 */
export async function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data       = JSON.parse(e.target.result);
        const incoming   = Array.isArray(data.stories) ? data.stories : [];
        if (!incoming.length) { resolve(0); return; }

        const existing   = loadStories();
        const existingIds = new Set(existing.map(s => s.id));
        const fresh      = incoming.filter(s => !existingIds.has(s.id));

        saveStories([...fresh, ...existing]);
        resolve(fresh.length);
      } catch (err) {
        reject(new Error('Invalid backup file. Expected z2s JSON export.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}

// ─── JSDoc typedefs ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} Story
 * @property {string}   id        Unique ID (timestamp string).
 * @property {string}   title     Story title.
 * @property {string}   url       Source URL.
 * @property {string}   summary   Short description / notes.
 * @property {string[]} tags      Array of tag strings.
 * @property {string}   source    Where you found it (e.g. "HTB", "Medium").
 * @property {string}   date      ISO date string (YYYY-MM-DD).
 */

/**
 * @typedef {Object} Settings
 * @property {string}  discordWebhook   Discord webhook URL.
 * @property {boolean} autoPost         Auto-post to Discord on save.
 * @property {string}  webhookUsername  Bot display name.
 * @property {string}  webhookAvatarUrl Bot avatar URL (optional).
 */
