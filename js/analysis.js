// Data Analysis and Badge Calculation

import * as spotify from './spotify.js';

// Badge Definitions
const BADGES = {
  obsessed: {
    id: 'obsessed',
    name: 'Obsessed',
    description: 'Top 5 across all time ranges',
    tier: 'obsidian',
    icon: '💀',
    condition: (profile) => {
      const ranks = [
        profile.artistFocus?.rank.short,
        profile.artistFocus?.rank.medium,
        profile.artistFocus?.rank.long
      ];
      return ranks.every(r => r !== null && r <= 5);
    }
  },
  devoted: {
    id: 'devoted',
    name: 'Devoted',
    description: 'Top 10 all-time artist',
    tier: 'gold',
    icon: '🩸',
    condition: (profile) => profile.artistFocus?.rank.long !== null && profile.artistFocus?.rank.long <= 10
  },
  completionist: {
    id: 'completionist',
    name: 'Completionist',
    description: '80%+ discography saved',
    tier: 'gold',
    icon: '💿',
    condition: (profile) => {
      const coverage = profile.artistFocus?.albumCoverage || [];
      if (coverage.length === 0) return false;
      const total = coverage.reduce((a, b) => a + b.totalTracks, 0);
      const saved = coverage.reduce((a, b) => a + b.savedCount, 0);
      return total > 0 && (saved / total) >= 0.8;
    }
  },
  deepCuts: {
    id: 'deepCuts',
    name: 'Deep Cuts',
    description: 'More album tracks than singles',
    tier: 'silver',
    icon: '🎵',
    condition: (profile) => {
      const saved = profile.artistFocus?.savedTracks || [];
      if (saved.length < 5) return false;
      const albumTracks = saved.filter(t => !t.isSingle).length;
      const singles = saved.filter(t => t.isSingle).length;
      return albumTracks > singles;
    }
  },
  evangelist: {
    id: 'evangelist',
    name: 'Evangelist',
    description: 'Artist in 3+ playlists',
    tier: 'silver',
    icon: '📢',
    condition: (profile) => (profile.artistInPlaylists?.length || 0) >= 3
  },
  dayOne: {
    id: 'dayOne',
    name: 'Day One',
    description: 'Following + long-term listener',
    tier: 'bronze',
    icon: '🌅',
    condition: (profile) =>
      profile.artistFocus?.following &&
      profile.artistFocus?.rank.long !== null &&
      profile.artistFocus?.rank.long <= 50
  },
  rising: {
    id: 'rising',
    name: 'Rising Star',
    description: 'Artist higher in short-term than long-term',
    tier: 'bronze',
    icon: '📈',
    condition: (profile) => {
      const short = profile.artistFocus?.rank.short;
      const long = profile.artistFocus?.rank.long;
      return short !== null && long !== null && short < long;
    }
  },
  loyalist: {
    id: 'loyalist',
    name: 'Loyalist',
    description: '20+ tracks saved',
    tier: 'silver',
    icon: '🛡️',
    condition: (profile) => (profile.artistFocus?.savedTracks?.length || 0) >= 20
  }
};

// Find artist rank in top artists list
function findArtistRank(topArtists, artistId) {
  const index = topArtists.findIndex(a => a.id === artistId);
  return index === -1 ? null : index + 1;
}

// Get tracks by artist from a list
function getTracksByArtist(tracks, artistId) {
  return tracks.filter(track =>
    track.artists?.some(a => a.id === artistId)
  );
}

// Build full devotion profile
export async function buildProfile(onProgress) {
  const profile = {
    user: null,
    topArtists: { short: [], medium: [], long: [] },
    topTracks: { short: [], medium: [], long: [] },
    artistFocus: null,
    artistInPlaylists: [],
    badges: []
  };

  // Fetch user info
  onProgress?.('Fetching your profile...');
  const user = await spotify.getCurrentUser();
  profile.user = {
    id: user.id,
    displayName: user.display_name,
    profileImage: user.images?.[0]?.url || null
  };

  // Fetch top artists for all time ranges
  onProgress?.('Analyzing your top artists...');
  const [shortArtists, mediumArtists, longArtists] = await Promise.all([
    spotify.getTopArtists('short_term'),
    spotify.getTopArtists('medium_term'),
    spotify.getTopArtists('long_term')
  ]);

  profile.topArtists.short = shortArtists.items;
  profile.topArtists.medium = mediumArtists.items;
  profile.topArtists.long = longArtists.items;

  // Debug logging
  console.log('[Devotion] Top Artists fetched:', {
    short: shortArtists.items?.length || 0,
    medium: mediumArtists.items?.length || 0,
    long: longArtists.items?.length || 0,
    shortSample: shortArtists.items?.slice(0, 3).map(a => a.name),
    mediumSample: mediumArtists.items?.slice(0, 3).map(a => a.name),
    longSample: longArtists.items?.slice(0, 3).map(a => a.name)
  });

  // Fetch top tracks for all time ranges
  onProgress?.('Analyzing your top tracks...');
  const [shortTracks, mediumTracks, longTracks] = await Promise.all([
    spotify.getTopTracks('short_term'),
    spotify.getTopTracks('medium_term'),
    spotify.getTopTracks('long_term')
  ]);

  profile.topTracks.short = shortTracks.items;
  profile.topTracks.medium = mediumTracks.items;
  profile.topTracks.long = longTracks.items;

  return profile;
}

// Focus profile on specific artist
export async function focusOnArtist(profile, artistId, onProgress) {
  onProgress?.('Fetching artist details...');
  const artist = await spotify.getArtist(artistId);

  // Get ranks across time ranges
  const ranks = {
    short: findArtistRank(profile.topArtists.short, artistId),
    medium: findArtistRank(profile.topArtists.medium, artistId),
    long: findArtistRank(profile.topArtists.long, artistId)
  };

  // Get tracks in user's top tracks
  const tracksInTop = [
    ...getTracksByArtist(profile.topTracks.short, artistId),
    ...getTracksByArtist(profile.topTracks.medium, artistId),
    ...getTracksByArtist(profile.topTracks.long, artistId)
  ];

  // Deduplicate tracks
  const uniqueTracksInTop = [...new Map(tracksInTop.map(t => [t.id, t])).values()];

  // Check if following
  onProgress?.('Checking follow status...');
  const following = await spotify.checkFollowingArtist(artistId);

  // Get artist's albums
  onProgress?.('Analyzing discography...');
  const albumsResponse = await spotify.getArtistAlbums(artistId);
  const albums = albumsResponse.items;

  // Get user's saved tracks
  onProgress?.('Scanning your saved tracks...');
  const savedTracksData = await spotify.getAllSavedTracks((current, total) => {
    onProgress?.(`Scanning saved tracks (${current}/${total})...`);
  });

  const allSavedTracks = savedTracksData.map(item => item.track);
  const savedArtistTracks = getTracksByArtist(allSavedTracks, artistId);

  // Calculate album coverage
  const albumCoverage = [];
  const singleAlbumIds = new Set();

  // Identify singles
  for (const album of albums) {
    if (album.album_type === 'single') {
      singleAlbumIds.add(album.id);
    }
  }

  // For each album, count how many tracks the user has saved
  for (const album of albums.filter(a => a.album_type === 'album')) {
    try {
      const albumTracks = await spotify.getAlbumTracks(album.id);
      const albumTrackIds = new Set(albumTracks.items.map(t => t.id));
      const savedCount = savedArtistTracks.filter(t => albumTrackIds.has(t.id)).length;

      albumCoverage.push({
        album: {
          id: album.id,
          name: album.name,
          image: album.images?.[0]?.url
        },
        savedCount,
        totalTracks: albumTracks.items.length
      });
    } catch (e) {
      // Skip albums we can't fetch
      console.warn(`Could not fetch album ${album.name}:`, e);
    }
  }

  // Mark tracks as singles or not
  const savedTracksWithType = savedArtistTracks.map(track => ({
    ...track,
    isSingle: track.album && singleAlbumIds.has(track.album.id)
  }));

  // Check playlists for artist
  onProgress?.('Checking your playlists...');
  let artistInPlaylists = [];
  try {
    const playlistsResponse = await spotify.getUserPlaylists();
    // Note: Full playlist track checking would require many API calls
    // For MVP, we'll just store playlist info
    artistInPlaylists = playlistsResponse.items || [];
  } catch (e) {
    console.warn('Could not fetch playlists:', e);
  }

  profile.artistFocus = {
    artist: {
      id: artist.id,
      name: artist.name,
      image: artist.images?.[0]?.url,
      genres: artist.genres,
      followers: artist.followers?.total
    },
    rank: ranks,
    tracksInTop: uniqueTracksInTop,
    savedTracks: savedTracksWithType,
    following,
    albumCoverage
  };

  profile.artistInPlaylists = artistInPlaylists;

  // Calculate badges
  profile.badges = calculateBadges(profile);

  return profile;
}

// Calculate earned badges
export function calculateBadges(profile) {
  const earnedBadges = [];

  for (const [key, badge] of Object.entries(BADGES)) {
    try {
      if (badge.condition(profile)) {
        earnedBadges.push({
          id: badge.id,
          name: badge.name,
          description: badge.description,
          tier: badge.tier,
          icon: badge.icon
        });
      }
    } catch (e) {
      // Badge condition failed, skip
    }
  }

  // Sort by tier (obsidian > gold > silver > bronze)
  const tierOrder = { obsidian: 0, gold: 1, silver: 2, bronze: 3 };
  earnedBadges.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  return earnedBadges;
}

// Calculate discography percentage
export function calculateDiscographyPercentage(profile) {
  const coverage = profile.artistFocus?.albumCoverage || [];
  if (coverage.length === 0) return 0;

  const total = coverage.reduce((a, b) => a + b.totalTracks, 0);
  const saved = coverage.reduce((a, b) => a + b.savedCount, 0);

  return total > 0 ? Math.round((saved / total) * 100) : 0;
}

// Get best rank across time ranges
export function getBestRank(profile) {
  if (!profile.artistFocus) return null;

  const ranks = [
    profile.artistFocus.rank.short,
    profile.artistFocus.rank.medium,
    profile.artistFocus.rank.long
  ].filter(r => r !== null);

  return ranks.length > 0 ? Math.min(...ranks) : null;
}

// Format rank display
export function formatRank(rank) {
  if (rank === null) return 'Not in top 50';
  if (rank === 1) return '#1 Top Artist';
  if (rank <= 5) return `#${rank} Top Artist`;
  if (rank <= 10) return `Top 10 Artist (#${rank})`;
  if (rank <= 25) return `Top 25 Artist (#${rank})`;
  return `Top 50 Artist (#${rank})`;
}

// Generate profile summary stats
export function getProfileSummary(profile) {
  if (!profile.artistFocus) {
    return {
      topArtist: profile.topArtists.long[0] || null,
      totalTopArtists: profile.topArtists.long.length,
      topGenres: extractTopGenres(profile.topArtists.long)
    };
  }

  const af = profile.artistFocus;
  return {
    artistName: af.artist.name,
    artistImage: af.artist.image,
    bestRank: getBestRank(profile),
    savedCount: af.savedTracks.length,
    discographyPercent: calculateDiscographyPercentage(profile),
    following: af.following,
    tracksInTop: af.tracksInTop.length,
    badges: profile.badges
  };
}

// Extract top genres from artists
function extractTopGenres(artists) {
  const genreCounts = {};

  for (const artist of artists) {
    for (const genre of artist.genres || []) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    }
  }

  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));
}
