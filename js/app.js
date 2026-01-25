// Main Application Logic

import * as spotify from './spotify.js';
import { buildProfile, focusOnArtist, getProfileSummary, formatRank, calculateDiscographyPercentage, getBestRank } from './analysis.js';
import { generateArtistCard, generateProfileCard, applyTheme, setCardSize } from './cards.js';
import { exportAsPng, copyToClipboard, generateFilename } from './export.js';

// App State
let currentMode = null; // 'artist' | 'profile'
let currentProfile = null;
let currentTheme = 'dark';
let currentSize = 'square';
let currentTimeRange = 'long'; // 'short' | 'medium' | 'long'
let searchTimeout = null;

// DOM Elements
const screens = {
  landing: document.getElementById('landing'),
  artistSearch: document.getElementById('artist-search'),
  loading: document.getElementById('loading'),
  results: document.getElementById('results')
};

const elements = {
  connectSpotify: document.getElementById('connect-spotify'),
  artistInput: document.getElementById('artist-input'),
  searchResults: document.getElementById('search-results'),
  spotifyLink: document.getElementById('spotify-link'),
  parseLink: document.getElementById('parse-link'),
  loadingText: document.getElementById('loading-text'),
  loadingSubtext: document.getElementById('loading-subtext'),
  progressFill: document.getElementById('progress-fill'),
  statsContent: document.getElementById('stats-content'),
  cardPreview: document.getElementById('card-preview'),
  downloadBtn: document.getElementById('download-btn'),
  copyBtn: document.getElementById('copy-btn')
};

// Screen Navigation
function showScreen(screenId) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenId]?.classList.add('active');
}

// Initialize App
async function init() {
  setupEventListeners();

  // Check if we just returned from OAuth callback
  const justAuthenticated = localStorage.getItem('devotion_just_authed');
  if (justAuthenticated && spotify.isAuthenticated()) {
    localStorage.removeItem('devotion_just_authed');
    const storedMode = localStorage.getItem('devotion_mode');
    if (storedMode === 'artist') {
      showScreen('artistSearch');
      currentMode = 'artist';
    } else if (storedMode === 'profile') {
      currentMode = 'profile';
      startAnalysis();
    } else {
      showScreen('landing');
    }
    return;
  }

  // Check if already authenticated (returning user)
  if (spotify.isAuthenticated()) {
    elements.connectSpotify.textContent = 'Connected! Choose a mode';
  }

  showScreen('landing');
}

// Event Listeners
function setupEventListeners() {
  // Mode selection
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode === 'campaign' || btn.classList.contains('disabled') || btn.classList.contains('loading')) return;

      currentMode = mode;
      localStorage.setItem('devotion_mode', mode);

      // Add loading state
      btn.classList.add('loading');

      if (!spotify.isAuthenticated()) {
        spotify.initiateAuth();
        return;
      }

      if (mode === 'artist') {
        btn.classList.remove('loading');
        showScreen('artistSearch');
        // Scroll to search input
        setTimeout(() => elements.artistInput.focus(), 100);
      } else if (mode === 'profile') {
        startAnalysis();
      }
    });
  });

  // Spotify connect button
  elements.connectSpotify.addEventListener('click', () => {
    if (spotify.isAuthenticated()) {
      return; // Already connected
    }
    localStorage.setItem('devotion_mode', 'profile'); // Default to profile
    spotify.initiateAuth();
  });

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen(btn.dataset.target);
      currentProfile = null;
      // Reset loading states on all mode buttons
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('loading'));
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Artist search
  elements.artistInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
      elements.searchResults.classList.remove('active');
      return;
    }

    searchTimeout = setTimeout(() => searchArtists(query), 300);
  });

  // Spotify link parsing
  elements.parseLink.addEventListener('click', () => {
    const url = elements.spotifyLink.value.trim();
    const artistId = spotify.extractArtistIdFromUrl(url);

    if (artistId) {
      selectArtist(artistId);
    } else {
      alert('Could not parse Spotify artist link');
    }
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTheme = btn.dataset.theme;
      updateCardPreview();
    });
  });

  // Size buttons
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = btn.dataset.size;
      setCardSize(elements.cardPreview, currentSize);
      updateCardPreview();
    });
  });

  // Time range buttons
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTimeRange = btn.dataset.time;
      renderStats();
      updateCardPreview();
    });
  });

  // Export buttons
  elements.downloadBtn.addEventListener('click', async () => {
    try {
      elements.downloadBtn.textContent = 'Exporting...';
      const cardElement = elements.cardPreview.querySelector('.devotion-card');
      const filename = generateFilename(currentProfile, currentMode);
      await exportAsPng(cardElement, filename);
      elements.downloadBtn.textContent = 'Download PNG';
    } catch (error) {
      alert('Export failed: ' + error.message);
      elements.downloadBtn.textContent = 'Download PNG';
    }
  });

  elements.copyBtn.addEventListener('click', async () => {
    try {
      elements.copyBtn.textContent = 'Copying...';
      const cardElement = elements.cardPreview.querySelector('.devotion-card');
      await copyToClipboard(cardElement);
      elements.copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        elements.copyBtn.textContent = 'Copy to Clipboard';
      }, 2000);
    } catch (error) {
      alert('Copy failed: ' + error.message);
      elements.copyBtn.textContent = 'Copy to Clipboard';
    }
  });
}

// Search artists
async function searchArtists(query) {
  try {
    const response = await spotify.searchArtists(query);
    const artists = response.artists.items;

    if (artists.length === 0) {
      elements.searchResults.innerHTML = '<div class="search-no-results">No artists found</div>';
      elements.searchResults.classList.add('active');
      return;
    }

    elements.searchResults.innerHTML = artists.map(artist => `
      <div class="search-result" data-artist-id="${artist.id}">
        <img src="${artist.images?.[2]?.url || artist.images?.[0]?.url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/></svg>'}" alt="${artist.name}">
        <div class="search-result-info">
          <div class="search-result-name">${artist.name}</div>
          <div class="search-result-followers">${formatNumber(artist.followers?.total || 0)} followers</div>
        </div>
      </div>
    `).join('');

    elements.searchResults.classList.add('active');

    // Add click handlers
    elements.searchResults.querySelectorAll('.search-result').forEach(result => {
      result.addEventListener('click', () => {
        selectArtist(result.dataset.artistId);
      });
    });
  } catch (error) {
    console.error('Search failed:', error);
    elements.searchResults.innerHTML = '<div class="search-error">Search failed</div>';
    elements.searchResults.classList.add('active');
  }
}

// Select artist and start analysis
async function selectArtist(artistId) {
  elements.searchResults.classList.remove('active');
  elements.artistInput.value = '';

  startAnalysis(artistId);
}

// Start analysis
async function startAnalysis(artistId = null) {
  showScreen('loading');
  updateProgress(0, 'Initializing...');

  try {
    // Build base profile
    updateProgress(10, 'Fetching your profile...');
    currentProfile = await buildProfile((msg) => {
      elements.loadingSubtext.textContent = msg;
    });

    updateProgress(40, 'Profile loaded');

    // If artist mode, focus on specific artist
    if (artistId) {
      updateProgress(50, 'Analyzing artist devotion...');
      currentProfile = await focusOnArtist(currentProfile, artistId, (msg) => {
        elements.loadingSubtext.textContent = msg;
      });
    }

    updateProgress(90, 'Generating card...');

    // Show results
    setTimeout(() => {
      updateProgress(100, 'Complete!');
      showResults();
    }, 500);

  } catch (error) {
    console.error('Analysis failed:', error);
    alert('Analysis failed: ' + error.message);
    showScreen('landing');
    // Reset loading states
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('loading'));
  }
}

// Update loading progress
function updateProgress(percent, text) {
  elements.progressFill.style.width = `${percent}%`;
  if (text) {
    elements.loadingSubtext.textContent = text;
  }
}

// Show results
function showResults() {
  showScreen('results');
  renderStats();
  updateCardPreview();
  // Reset loading states on all mode buttons
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('loading'));
}

// Render stats panel
function renderStats() {
  if (!currentProfile) return;

  if (currentProfile.artistFocus) {
    renderArtistStats();
  } else {
    renderProfileStats();
  }
}

// Render artist-focused stats
function renderArtistStats() {
  const af = currentProfile.artistFocus;
  const selectedRank = af.rank[currentTimeRange];
  const discographyPercent = calculateDiscographyPercentage(currentProfile);

  const badgesHtml = currentProfile.badges.length > 0
    ? `<div class="badges-display">
        ${currentProfile.badges.map(b =>
          `<span class="badge ${b.tier}">${b.icon} ${b.name}</span>`
        ).join('')}
       </div>`
    : '';

  // Helper to highlight selected time range
  const isSelected = (range) => range === currentTimeRange ? 'highlight' : '';

  elements.statsContent.innerHTML = `
    <div class="stats-header">
      <img src="${af.artist.image || ''}" alt="${af.artist.name}">
      <div class="stats-header-info">
        <h2>${af.artist.name}</h2>
        <p>${formatNumber(af.artist.followers)} followers</p>
      </div>
    </div>

    <div class="stat-row">
      <span class="stat-label">Ranking (${TIME_RANGE_LABELS[currentTimeRange]})</span>
      <span class="stat-value highlight">${selectedRank !== null ? formatRank(selectedRank) : 'Not in top 50'}</span>
    </div>

    <div class="stat-row ${isSelected('short')}">
      <span class="stat-label">Short-term rank</span>
      <span class="stat-value">${af.rank.short ? `#${af.rank.short}` : '-'}</span>
    </div>

    <div class="stat-row ${isSelected('medium')}">
      <span class="stat-label">Medium-term rank</span>
      <span class="stat-value">${af.rank.medium ? `#${af.rank.medium}` : '-'}</span>
    </div>

    <div class="stat-row ${isSelected('long')}">
      <span class="stat-label">Long-term rank</span>
      <span class="stat-value">${af.rank.long ? `#${af.rank.long}` : '-'}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">Tracks Saved</span>
      <span class="stat-value">${af.savedTracks.length}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">Discography</span>
      <span class="stat-value">${discographyPercent}%</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">Following</span>
      <span class="stat-value">${af.following ? 'Yes ✓' : 'No'}</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">In Top Tracks</span>
      <span class="stat-value">${af.tracksInTop.length} ${af.tracksInTop.length === 1 ? 'track' : 'tracks'}</span>
    </div>

    ${badgesHtml}
  `;
}

// Time range labels
const TIME_RANGE_LABELS = {
  short: 'Last 4 Weeks',
  medium: 'Last 6 Months',
  long: 'All Time'
};

// Render profile overview stats
function renderProfileStats() {
  const topArtists = currentProfile.topArtists[currentTimeRange].slice(0, 10);
  const timeLabel = TIME_RANGE_LABELS[currentTimeRange];

  const artistList = topArtists.length > 0
    ? topArtists.map((artist, i) => `
        <div class="stat-row">
          <span class="stat-label">#${i + 1}</span>
          <span class="stat-value">${artist.name}</span>
        </div>
      `).join('')
    : `<p class="empty-state">No listening data for ${timeLabel.toLowerCase()}. Try a different time range!</p>`;

  elements.statsContent.innerHTML = `
    <div class="stats-header">
      ${currentProfile.user.profileImage ?
        `<img src="${currentProfile.user.profileImage}" alt="${currentProfile.user.displayName}">` : ''}
      <div class="stats-header-info">
        <h2>${currentProfile.user.displayName || currentProfile.user.id}</h2>
        <p>Your Devotion Profile</p>
      </div>
    </div>

    <h3 style="margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Top Artists (${timeLabel})</h3>
    ${artistList}
  `;
}

// Update card preview
function updateCardPreview() {
  if (!currentProfile) return;

  applyTheme(elements.cardPreview, currentTheme);

  const options = { theme: currentTheme, size: currentSize, timeRange: currentTimeRange };

  if (currentProfile.artistFocus) {
    elements.cardPreview.innerHTML = generateArtistCard(currentProfile, options);
  } else {
    elements.cardPreview.innerHTML = generateProfileCard(currentProfile, options);
  }
}

// Utility: Format large numbers
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Close search results when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    elements.searchResults.classList.remove('active');
  }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);
