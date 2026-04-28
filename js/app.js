/**
 * app.js
 * stashd — core application logic.
 *
 * Architecture: vanilla ES modules, no build step.
 * State is held in memory and synced to localStorage via storage.js.
 * Discord integration is handled by discord.js.
 */

import {
  loadStories, addStory, deleteStory, updateStory,
  loadSettings, saveSettings,
  exportJSON, importJSON,
} from './storage.js';

import {
  postStory, postDigest, postTextDigest, testWebhook,
} from './discord.js';

// ─── State ────────────────────────────────────────────────────────────────────

let state = {
  stories:    [],      // full story list
  settings:   {},      // app settings
  query:      '',      // active search string
  activeTag:  null,    // single tag filter
  editingId:  null,    // id of story being edited (null = new)
  view:       'list',  // 'list' | 'settings'
};

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  state.stories  = loadStories();
  state.settings = loadSettings();
  render();
  attachGlobalListeners();
});

// ─── Derived data ─────────────────────────────────────────────────────────────

function filteredStories() {
  const q = state.query.toLowerCase();
  return state.stories.filter(s => {
    const matchesQuery =
      !q ||
      s.title.toLowerCase().includes(q)   ||
      s.url.toLowerCase().includes(q)     ||
      s.summary.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q));
    const matchesTag = !state.activeTag || s.tags.includes(state.activeTag);
    return matchesQuery && matchesTag;
  });
}

function allTags() {
  const counts = {};
  state.stories.forEach(s => s.tags.forEach(t => {
    counts[t] = (counts[t] || 0) + 1;
  }));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])  // most-used first
    .map(([tag]) => tag);
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render() {
  renderStats();
  renderTagFilter();
  renderList();
}

function renderStats() {
  document.getElementById('stat-stories').textContent = state.stories.length;
  document.getElementById('stat-tags').textContent    = allTags().length;

  // Show Discord quick-action row only when a webhook is configured
  const discordRow = document.getElementById('discord-row');
  if (discordRow) {
    discordRow.style.display = state.settings.discordWebhook ? 'flex' : 'none';
  }
}

function renderTagFilter() {
  const container = document.getElementById('tag-filter');
  const tags = allTags();
  if (!tags.length) { container.innerHTML = ''; return; }

  container.innerHTML = tags.map(tag =>
    `<button class="tag ${state.activeTag === tag ? 'active' : ''}"
             data-action="filter-tag" data-tag="${esc(tag)}">${esc(tag)}</button>`
  ).join('');
}

function renderList() {
  const container = document.getElementById('story-list');
  const stories   = filteredStories();

  if (!stories.length) {
    container.innerHTML = `
      <div class="empty">
        <p class="empty-mono">// no entries found</p>
        <p>${state.stories.length ? 'Try a different search or clear the tag filter.' : 'Add your first story above.'}</p>
      </div>`;
    return;
  }

  container.innerHTML = stories.map(s => renderCard(s)).join('');
}

function renderCard(s) {
  const tagHtml = s.tags.map(t =>
    `<button class="tag ${state.activeTag === t ? 'active' : ''}"
             data-action="filter-tag" data-tag="${esc(t)}">${esc(t)}</button>`
  ).join('');

  const sourceHtml = s.source
    ? `<span class="tag source">${esc(s.source)}</span>` : '';

  return `
    <article class="story-card" data-id="${esc(s.id)}">
      <div class="card-top">
        <div class="card-info">
          <h3 class="story-title">${esc(s.title)}</h3>
          ${s.url ? `<a class="story-url" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : ''}
        </div>
        <div class="card-actions">
          <button class="icon-btn edit-btn"  data-action="edit"   data-id="${esc(s.id)}" title="Edit">✎</button>
          <button class="icon-btn post-btn"  data-action="post"   data-id="${esc(s.id)}" title="Post to Discord">↗</button>
          <button class="icon-btn del-btn"   data-action="delete" data-id="${esc(s.id)}" title="Delete">✕</button>
        </div>
      </div>
      ${s.summary ? `<p class="story-summary">${esc(s.summary)}</p>` : ''}
      <div class="story-meta">
        ${tagHtml}${sourceHtml}
        <span class="story-date">${s.date}</span>
      </div>
    </article>`;
}

// ─── Global event delegation ──────────────────────────────────────────────────

function attachGlobalListeners() {
  // Delegate clicks on dynamic elements
  document.addEventListener('click', async (e) => {
    const el     = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id     = el.dataset.id;
    const tag    = el.dataset.tag;

    switch (action) {
      case 'filter-tag':   handleFilterTag(tag);       break;
      case 'edit':         handleEdit(id);             break;
      case 'delete':       handleDelete(id);           break;
      case 'post':         await handlePostOne(id);    break;
      case 'save-story':   await handleSaveStory();    break;
      case 'cancel-form':  handleCancelForm();         break;
      case 'toggle-form':  handleToggleForm();         break;
      case 'clear-filter': handleClearFilter();        break;
      case 'post-digest':  await handlePostDigest();   break;
      case 'post-text':    await handlePostText();     break;
      case 'copy-discord': handleCopyDiscord();        break;
      case 'export-json':  exportJSON();               break;
      case 'test-webhook': await handleTestWebhook();  break;
      case 'save-settings': handleSaveSettings();      break;
      case 'show-settings': handleShowSettings();      break;
      case 'hide-settings': handleHideSettings();      break;
    }
  });

  // Search input
  document.getElementById('search')?.addEventListener('input', (e) => {
    state.query = e.target.value;
    renderList();
    renderTagFilter();
  });

  // Import file picker
  document.getElementById('import-file')?.addEventListener('change', handleImport);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleFilterTag(tag) {
  state.activeTag = state.activeTag === tag ? null : tag;
  renderTagFilter();
  renderList();
}

function handleClearFilter() {
  state.activeTag = null;
  state.query     = '';
  document.getElementById('search').value = '';
  render();
}

function handleToggleForm() {
  const panel = document.getElementById('story-form');
  const isOpen = panel.style.display !== 'none';
  if (isOpen) {
    handleCancelForm();
  } else {
    panel.style.display = 'block';
    document.getElementById('f-title').focus();
    state.editingId = null;
    clearForm();
  }
}

function handleCancelForm() {
  document.getElementById('story-form').style.display = 'none';
  state.editingId = null;
  clearForm();
}

function handleEdit(id) {
  const story = state.stories.find(s => s.id === id);
  if (!story) return;
  state.editingId = id;
  document.getElementById('f-title').value   = story.title;
  document.getElementById('f-url').value     = story.url;
  document.getElementById('f-summary').value = story.summary;
  document.getElementById('f-tags').value    = story.tags.join(', ');
  document.getElementById('f-source').value  = story.source || '';
  document.getElementById('story-form').style.display = 'block';
  document.getElementById('form-heading').textContent  = '// edit entry';
  document.getElementById('f-title').focus();
}

async function handleSaveStory() {
  const title   = document.getElementById('f-title').value.trim();
  const url     = document.getElementById('f-url').value.trim();
  const summary = document.getElementById('f-summary').value.trim();
  const tags    = document.getElementById('f-tags').value
                    .split(',').map(t => t.trim()).filter(Boolean);
  const source  = document.getElementById('f-source').value.trim();

  if (!title) { toast('title is required', 'error'); return; }

  if (state.editingId) {
    state.stories = updateStory(state.editingId, { title, url, summary, tags, source });
    toast('story updated');
  } else {
    const story = {
      id:      Date.now().toString(),
      title, url, summary, tags, source,
      date:    new Date().toISOString().slice(0, 10),
    };
    state.stories = addStory(story);

    // Auto-post to Discord if enabled
    if (state.settings.autoPost && state.settings.discordWebhook) {
      try {
        await postStory(state.settings.discordWebhook, story, {
          username:   state.settings.webhookUsername,
          avatarUrl:  state.settings.webhookAvatarUrl,
        });
        toast('story archived + posted to Discord');
      } catch (err) {
        toast(`archived — Discord post failed: ${err.message}`, 'error');
      }
    } else {
      toast('story archived');
    }
  }

  handleCancelForm();
  render();
}

function handleDelete(id) {
  if (!confirm('Remove this story from the archive?')) return;
  state.stories = deleteStory(id);
  render();
  toast('story removed');
}

async function handlePostOne(id) {
  const story = state.stories.find(s => s.id === id);
  if (!story) return;
  const url = state.settings.discordWebhook;
  if (!url) { toast('No webhook configured — open Settings', 'error'); return; }
  try {
    await postStory(url, story, {
      username:  state.settings.webhookUsername,
      avatarUrl: state.settings.webhookAvatarUrl,
    });
    toast(`"${story.title}" posted to Discord`);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handlePostDigest() {
  const url     = state.settings.discordWebhook;
  const stories = filteredStories();
  if (!url)          { toast('No webhook configured — open Settings', 'error'); return; }
  if (!stories.length) { toast('No stories to post', 'error'); return; }
  try {
    await postDigest(url, stories, {
      username:  state.settings.webhookUsername,
      avatarUrl: state.settings.webhookAvatarUrl,
      label:     'Story Digest',
    });
    toast(`${Math.min(stories.length, 10)} stories posted as digest`);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handlePostText() {
  const url     = state.settings.discordWebhook;
  const stories = filteredStories();
  if (!url)          { toast('No webhook configured — open Settings', 'error'); return; }
  if (!stories.length) { toast('No stories to post', 'error'); return; }
  try {
    await postTextDigest(url, stories, { username: state.settings.webhookUsername });
    toast('Text digest posted to Discord');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function handleCopyDiscord() {
  const stories = filteredStories();
  if (!stories.length) { toast('nothing to copy', 'error'); return; }
  const lines = ['**Stashd**', ''];
  stories.slice(0, 10).forEach((s, i) => {
    lines.push(`**${i + 1}. ${s.title}**`);
    if (s.url)     lines.push(`> <${s.url}>`);
    if (s.summary) lines.push(`> ${s.summary}`);
    if (s.tags.length) lines.push(`> ${s.tags.map(t => `\`${t}\``).join(' ')}`);
    lines.push('');
  });
  if (stories.length > 10) lines.push(`_...and ${stories.length - 10} more_`);
  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => toast('copied for Discord'))
    .catch(() => toast('clipboard unavailable', 'error'));
}

async function handleTestWebhook() {
  const url = document.getElementById('s-webhook').value.trim();
  if (!url) { toast('Enter a webhook URL first', 'error'); return; }
  try {
    await testWebhook(url);
    toast('Test message sent successfully');
  } catch (err) {
    toast(err.message, 'error');
  }
}

function handleSaveSettings() {
  const patch = {
    discordWebhook:   document.getElementById('s-webhook').value.trim(),
    autoPost:         document.getElementById('s-autopost').checked,
    webhookUsername:  document.getElementById('s-username').value.trim() || 'Stashd',
    webhookAvatarUrl: document.getElementById('s-avatar').value.trim(),
  };
  state.settings = saveSettings(patch);
  toast('settings saved');
}

function handleShowSettings() {
  document.getElementById('settings-panel').style.display = 'block';
  document.getElementById('main-view').style.display      = 'none';
  document.getElementById('s-webhook').value  = state.settings.discordWebhook || '';
  document.getElementById('s-autopost').checked = state.settings.autoPost;
  document.getElementById('s-username').value = state.settings.webhookUsername;
  document.getElementById('s-avatar').value   = state.settings.webhookAvatarUrl || '';
}

function handleHideSettings() {
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('main-view').style.display      = 'block';
}

async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const count = await importJSON(file);
    state.stories = loadStories();
    render();
    toast(`${count} ${count === 1 ? 'story' : 'stories'} imported`);
  } catch (err) {
    toast(err.message, 'error');
  }
  e.target.value = '';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clearForm() {
  ['f-title', 'f-url', 'f-summary', 'f-tags', 'f-source']
    .forEach(id => { document.getElementById(id).value = ''; });
  const heading = document.getElementById('form-heading');
  if (heading) heading.textContent = '// new entry';
}

/**
 * HTML-escape a string to prevent XSS in innerHTML.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Show a transient toast notification.
 * @param {string}             message
 * @param {'info'|'error'}     type
 */
function toast(message, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent  = message;
  el.className    = `toast show ${type}`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}
