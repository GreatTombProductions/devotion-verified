// Card Template Generation

import { formatRank, calculateDiscographyPercentage, getBestRank } from './analysis.js';

// Generate Artist Devotion Card HTML
export function generateArtistCard(profile, options = {}) {
  const { theme = 'dark', size = 'square' } = options;
  const af = profile.artistFocus;

  if (!af) {
    return '<div class="card-error">No artist selected</div>';
  }

  const bestRank = getBestRank(profile);
  const discographyPercent = calculateDiscographyPercentage(profile);
  const badgesHtml = profile.badges.slice(0, 3).map(badge =>
    `<span class="card-badge badge-${badge.tier}">${badge.icon} ${badge.name}</span>`
  ).join('');

  const dimensions = size === 'story'
    ? 'width: 1080px; height: 1920px;'
    : 'width: 600px; height: 600px;';

  return `
    <div class="devotion-card theme-${theme}" style="${dimensions}">
      <img
        class="card-artist-image"
        src="${af.artist.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>'}"
        alt="${af.artist.name}"
        crossorigin="anonymous"
      >

      <div class="card-header">
        <p class="card-subtitle">MY DEVOTION TO</p>
        <h2 class="card-title">${escapeHtml(af.artist.name.toUpperCase())}</h2>
      </div>

      <div class="card-divider"></div>

      <div class="card-stats">
        ${bestRank !== null ? `
          <div class="card-stat">
            <span class="card-stat-icon">🩸</span>
            <span>${formatRank(bestRank)}</span>
          </div>
        ` : ''}

        <div class="card-stat">
          <span class="card-stat-icon">🎵</span>
          <span>${af.savedTracks.length} tracks saved</span>
        </div>

        ${discographyPercent > 0 ? `
          <div class="card-stat">
            <span class="card-stat-icon">💿</span>
            <span>${discographyPercent}% discography</span>
          </div>
        ` : ''}

        ${af.following ? `
          <div class="card-stat">
            <span class="card-stat-icon">✓</span>
            <span>Following</span>
          </div>
        ` : ''}
      </div>

      ${profile.badges.length > 0 ? `
        <div class="card-badges">
          ${badgesHtml}
        </div>
      ` : ''}

      <div class="card-footer">
        <span>devotion.verified</span>
        <span>@${escapeHtml(profile.user.displayName || profile.user.id)}</span>
      </div>
    </div>
  `;
}

// Generate Profile Overview Card HTML
export function generateProfileCard(profile, options = {}) {
  const { theme = 'dark', size = 'square' } = options;

  const topArtists = profile.topArtists.long.slice(0, 5);
  const maxFollowers = topArtists[0]?.followers?.total || 1;

  const artistRows = topArtists.map((artist, i) => {
    const barWidth = Math.max(20, (artist.followers?.total || 0) / maxFollowers * 100);
    return `
      <div class="top-artist-row">
        <span class="top-artist-rank">${i + 1}</span>
        <span class="top-artist-name">${escapeHtml(artist.name)}</span>
        <div class="top-artist-bar">
          <div class="top-artist-bar-fill" style="width: ${barWidth}%"></div>
        </div>
      </div>
    `;
  }).join('');

  const dimensions = size === 'story'
    ? 'width: 1080px; height: 1920px;'
    : 'width: 600px; height: 600px;';

  return `
    <div class="devotion-card profile-card theme-${theme}" style="${dimensions}">
      ${profile.user.profileImage ? `
        <img
          class="card-artist-image"
          src="${profile.user.profileImage}"
          alt="${profile.user.displayName}"
          crossorigin="anonymous"
        >
      ` : ''}

      <div class="card-header">
        <p class="card-subtitle">DEVOTION PROFILE</p>
        <h2 class="card-title">${escapeHtml(profile.user.displayName || profile.user.id)}</h2>
      </div>

      <div class="card-divider"></div>

      <div class="card-top-artists">
        <p class="card-section-title">TOP ARTISTS (ALL TIME)</p>
        ${artistRows}
      </div>

      <div class="card-footer">
        <span>devotion.verified</span>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  `;
}

// HTML escape helper
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Get card style overrides for themes
export function getThemeStyles(theme) {
  const themes = {
    dark: {
      '--card-bg': '#0d0d0d',
      '--card-text': '#ffffff',
      '--card-text-secondary': '#a0a0a0',
      '--card-accent': '#1DB954',
      '--card-border': '#2a2a2a'
    },
    light: {
      '--card-bg': '#ffffff',
      '--card-text': '#1a1a1a',
      '--card-text-secondary': '#666666',
      '--card-accent': '#1DB954',
      '--card-border': '#e0e0e0'
    },
    metal: {
      '--card-bg': '#050505',
      '--card-text': '#ffffff',
      '--card-text-secondary': '#888888',
      '--card-accent': '#8b0000',
      '--card-border': '#8b0000'
    },
    czarkain: {
      '--card-bg': '#0a0810',
      '--card-text': '#e8e0f0',
      '--card-text-secondary': '#8a7a9a',
      '--card-accent': '#6b2d5c',
      '--card-border': '#6b2d5c'
    }
  };

  return themes[theme] || themes.dark;
}

// Apply theme to card preview container
export function applyTheme(element, theme) {
  // Remove existing theme classes
  element.classList.remove('theme-dark', 'theme-light', 'theme-metal', 'theme-czarkain');
  element.classList.add(`theme-${theme}`);

  // Also apply to body for global styling
  document.body.classList.remove('theme-dark', 'theme-light', 'theme-metal', 'theme-czarkain');
  document.body.classList.add(`theme-${theme}`);
}

// Update card size
export function setCardSize(container, size) {
  container.classList.remove('story');
  if (size === 'story') {
    container.classList.add('story');
  }
}
