// Spotify OAuth 2.0 PKCE Flow + API Wrapper

const SPOTIFY_CLIENT_ID = 'e94b7f19fe754828bc335fd2fc360bd5';
const REDIRECT_URI = 'https://devotion-verified.vercel.app/callback/';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-read-recently-played',
  'user-library-read',
  'user-follow-read',
  'playlist-read-private',
  'playlist-read-collaborative'
].join(' ');

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

// Token storage
let accessToken = null;
let tokenExpiry = null;

// PKCE Helper Functions
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(buffer) {
  let str = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

// Auth Functions
export async function initiateAuth() {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);

  // Store verifier for token exchange
  localStorage.setItem('spotify_code_verifier', codeVerifier);
  localStorage.setItem('spotify_auth_state', state);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

export async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  if (error) {
    throw new Error(`Auth error: ${error}`);
  }

  if (!code) {
    return false; // No callback to handle
  }

  const storedState = localStorage.getItem('spotify_auth_state');
  if (state !== storedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  const codeVerifier = localStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) {
    throw new Error('No code verifier found');
  }

  // Exchange code for token
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
  }

  const data = await response.json();

  // Store token
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  localStorage.setItem('spotify_access_token', accessToken);
  localStorage.setItem('spotify_token_expiry', tokenExpiry.toString());

  // Cleanup
  localStorage.removeItem('spotify_code_verifier');
  localStorage.removeItem('spotify_auth_state');

  // Clear URL params
  window.history.replaceState({}, document.title, window.location.pathname);

  return true;
}

export function isAuthenticated() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return true;
  }

  // Check localStorage
  const storedToken = localStorage.getItem('spotify_access_token');
  const storedExpiry = localStorage.getItem('spotify_token_expiry');

  if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
    accessToken = storedToken;
    tokenExpiry = parseInt(storedExpiry);
    return true;
  }

  return false;
}

export function logout() {
  accessToken = null;
  tokenExpiry = null;
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_token_expiry');
}

// API Helper
async function fetchAPI(endpoint, options = {}) {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers
    }
  });

  if (response.status === 401) {
    logout();
    throw new Error('Token expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  return response.json();
}

// API Methods
export async function getCurrentUser() {
  return fetchAPI('/me');
}

export async function getTopArtists(timeRange = 'medium_term', limit = 50) {
  return fetchAPI(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
}

export async function getTopTracks(timeRange = 'medium_term', limit = 50) {
  return fetchAPI(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
}

export async function getRecentlyPlayed(limit = 50) {
  return fetchAPI(`/me/player/recently-played?limit=${limit}`);
}

export async function getArtist(artistId) {
  return fetchAPI(`/artists/${artistId}`);
}

export async function getArtistAlbums(artistId, limit = 50) {
  return fetchAPI(`/artists/${artistId}/albums?include_groups=album,single&limit=${limit}`);
}

export async function checkFollowingArtist(artistId) {
  const data = await fetchAPI(`/me/following/contains?type=artist&ids=${artistId}`);
  return data[0];
}

export async function getSavedTracks(limit = 50, offset = 0) {
  return fetchAPI(`/me/tracks?limit=${limit}&offset=${offset}`);
}

export async function getUserPlaylists(limit = 50) {
  return fetchAPI(`/me/playlists?limit=${limit}`);
}

export async function searchArtists(query, limit = 10) {
  return fetchAPI(`/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`);
}

export async function getAlbumTracks(albumId) {
  return fetchAPI(`/albums/${albumId}/tracks?limit=50`);
}

// Utility to extract artist ID from Spotify URL
export function extractArtistIdFromUrl(url) {
  const patterns = [
    /spotify\.com\/artist\/([a-zA-Z0-9]+)/,
    /spotify:artist:([a-zA-Z0-9]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// Get all saved tracks (paginated)
export async function getAllSavedTracks(onProgress) {
  const allTracks = [];
  let offset = 0;
  const limit = 50;
  let total = Infinity;

  while (offset < total && offset < 500) { // Cap at 500 to avoid too many requests
    const data = await getSavedTracks(limit, offset);
    total = data.total;
    allTracks.push(...data.items);
    offset += limit;

    if (onProgress) {
      onProgress(Math.min(offset, total), total);
    }
  }

  return allTracks;
}
