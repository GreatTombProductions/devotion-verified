**Status: IMPLEMENTED** — Retained as design record.

# Implementation Prompt: Devotion Verified

## Overview

A web app that connects to a user's Spotify account and generates shareable "devotion cards" showing their listening dedication to specific artists. Fans verify their loyalty with data; artists get organic promotional content when fans share.

---

## Core Flow

1. **Landing:** Choose mode (Artist Lookup / General Stats / Campaign)
2. **Auth:** Spotify OAuth login
3. **Analysis:** Pull and process listening data
4. **Generation:** Create customizable shareable card
5. **Export:** Download as image or share directly

---

## Spotify API Endpoints We'll Use
```javascript
// User's top artists (short/medium/long term)
GET /me/top/artists?time_range={range}&limit=50

// User's top tracks (short/medium/long term)  
GET /me/top/tracks?time_range={range}&limit=50

// Recently played (last 50 tracks with timestamps)
GET /me/player/recently-played?limit=50

// Get artist details
GET /artists/{id}

// Get artist's albums
GET /artists/{id}/albums

// Check if user follows artist
GET /me/following/contains?type=artist&ids={id}

// User's saved tracks (check for deep cuts)
GET /me/tracks?limit=50&offset={offset}

// User's playlists (check for artist inclusion)
GET /me/playlists
```

---

## Data Model
```typescript
type TimeRange = 'short_term' | 'medium_term' | 'long_term';

type DevotionProfile = {
  user: {
    id: string;
    displayName: string;
    profileImage: string;
  };
  
  // General stats
  topArtists: {
    short: Artist[];
    medium: Artist[];
    long: Artist[];
  };
  topTracks: {
    short: Track[];
    medium: Track[];
    long: Track[];
  };
  
  // Artist-specific (when focused)
  artistFocus?: {
    artist: Artist;
    rank: {
      short: number | null;  // position in top 50, null if not present
      medium: number | null;
      long: number | null;
    };
    tracksInTop: Track[];           // their songs in user's top tracks
    savedTracks: Track[];           // user's saved tracks by this artist
    percentile?: number;            // "top X% of listeners" if we can estimate
    following: boolean;
    albumCoverage: {
      album: Album;
      savedCount: number;
      totalTracks: number;
    }[];
  };
  
  // Computed badges
  badges: Badge[];
};

type Badge = {
  id: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'obsidian';
  icon: string;
};

// Badge examples:
// - "Devoted" (artist in top 10 long-term)
// - "Deep Cuts" (>50% non-single tracks saved)
// - "Day One" (following + long-term top 50)
// - "Completionist" (>80% discography saved)
// - "Obsessed" (artist in top 3 all time ranges)
```

---

## Card Templates

### Artist Devotion Card
```
┌─────────────────────────────────────┐
│  [Artist Image]                     │
│                                     │
│  MY DEVOTION TO                     │
│  [ARTIST NAME]                      │
│  ─────────────────                  │
│                                     │
│  🩸 #3 All-Time Artist              │
│  🎵 47 tracks saved                 │
│  💿 89% discography                 │
│  🔥 Top 2% of listeners             │
│                                     │
│  [Badge] [Badge] [Badge]            │
│                                     │
│  ──────────────────────────         │
│  devotion.verified • @username      │
└─────────────────────────────────────┘
```

### General Wrapped-Style Card
```
┌─────────────────────────────────────┐
│  [User Avatar]                      │
│  @username's Devotion Profile       │
│  ─────────────────                  │
│                                     │
│  TOP ARTISTS                        │
│  1. [Artist] ████████████ 847hrs    │
│  2. [Artist] ████████░░░ 412hrs     │
│  3. [Artist] ██████░░░░░ 283hrs     │
│                                     │
│  GENRE ALIGNMENT                    │
│  Metal ████████████░░ 73%           │
│  Electronic █████░░░░░░ 31%         │
│                                     │
│  [Badges earned]                    │
└─────────────────────────────────────┘
```

### Campaign Card (for artist releases)
```
┌─────────────────────────────────────┐
│  [Album Art]                        │
│                                     │
│  I CONTRIBUTED TO                   │
│  [ALBUM NAME]                       │
│  ─────────────────                  │
│                                     │
│  ⚔️ 127 streams                     │
│  🎯 Damage dealt: 1,270 HP          │
│  📊 Top 5% of raiders               │
│                                     │
│  RELEASE UNLOCKED: MAR 15           │
│  ████████████████████░░ 94%         │
│                                     │
│  [Raider Badge]                     │
└─────────────────────────────────────┘
```

---

## UI Screens

### Screen 1: Landing
- Logo + tagline ("Verify your devotion")
- Three mode buttons:
  - "Artist Deep Dive" → search for specific artist
  - "My Profile" → general stats
  - "Join Campaign" → enter campaign code
- "Connect Spotify" CTA
- Example cards in background

### Screen 2: Artist Search (if that mode)
- Search bar with Spotify autocomplete
- Recent/popular artist suggestions
- "Or paste Spotify artist link"

### Screen 3: Loading/Analysis
- Progress animation while fetching
- Skeleton cards building in real-time
- Fun facts appearing ("Scanning your library...")

### Screen 4: Results Dashboard
- Main stats display
- Card preview (live-updating)
- Customization panel:
  - Card style (Light / Dark / Artist-themed / Czarkain)
  - Stats to show/hide
  - Background options
  - Badge selection
- Export buttons (PNG / Share to Twitter / Copy link)

### Screen 5: Card Detail/Export
- Full-size card preview
- Download button
- Share buttons (Twitter, Instagram story size, Discord)
- "Generate new card" / "Try another artist"

---

## Badge System
```javascript
const BADGES = {
  // Rank-based
  devoted: {
    condition: (p) => p.artistFocus?.rank.long <= 10,
    tier: 'gold',
    name: 'Devoted',
    description: 'Top 10 all-time artist'
  },
  obsessed: {
    condition: (p) => [p.artistFocus?.rank.short, p.artistFocus?.rank.medium, p.artistFocus?.rank.long]
      .every(r => r && r <= 5),
    tier: 'obsidian',
    name: 'Obsessed',
    description: 'Top 5 across all time ranges'
  },
  
  // Collection-based
  completionist: {
    condition: (p) => {
      const coverage = p.artistFocus?.albumCoverage || [];
      const total = coverage.reduce((a, b) => a + b.totalTracks, 0);
      const saved = coverage.reduce((a, b) => a + b.savedCount, 0);
      return total > 0 && (saved / total) > 0.8;
    },
    tier: 'gold',
    name: 'Completionist',
    description: '80%+ discography saved'
  },
  deepCuts: {
    condition: (p) => {
      // Check if saved tracks skew toward album tracks vs singles
      // Would need to flag singles in data processing
      return p.artistFocus?.savedTracks.filter(t => !t.isSingle).length > 
             p.artistFocus?.savedTracks.filter(t => t.isSingle).length;
    },
    tier: 'silver',
    name: 'Deep Cuts',
    description: 'More album tracks than singles'
  },
  
  // Engagement-based
  evangelist: {
    condition: (p) => {
      // Check if artist appears in user's public playlists
      return p.artistInPlaylists && p.artistInPlaylists.length >= 3;
    },
    tier: 'silver',
    name: 'Evangelist',
    description: 'Artist in 3+ playlists'
  },
  
  // Following
  dayOne: {
    condition: (p) => p.artistFocus?.following && p.artistFocus?.rank.long <= 50,
    tier: 'bronze',
    name: 'Day One',
    description: 'Following + long-term listener'
  }
};
```

---

## Aesthetic Direction

### Default Theme
- Clean, modern, slightly dark
- Spotify green accents
- Card-focused design

### Dark/Metal Theme
- Near-black backgrounds (#0a0a0a)
- Blood red accents (#8b0000)
- Gothic typography (Cinzel headers)
- Subtle texture overlays

### Czarkain Theme (unlockable/toggle)
- Full grimoire aesthetic
- Blood Pool visual language
- "Binding Strength" instead of stats
- Attunement-coded sections
- Available for users who want it / specific artist campaigns

### Artist-Themed (stretch)
- Pull dominant colors from artist image
- Generate complementary palette
- Artist name in stylized treatment

---

## Technical Stack

- **Framework:** Vanilla JS or lightweight (Vite if build step desired)
- **Auth:** Spotify OAuth 2.0 PKCE flow (client-side safe)
- **Styling:** Tailwind or custom CSS
- **Card Generation:** HTML → html2canvas → PNG export
- **Hosting:** Vercel (easy Spotify redirect URI setup)

---

## Campaign Mode (Stretch Feature)

For artist release campaigns:
```typescript
type Campaign = {
  id: string;
  artistId: string;
  name: string;              // "ARISE EP Release Raid"
  targetTrackIds: string[];  // tracks that count
  startDate: Date;
  baselineReleaseDate: Date;
  maxAcceleration: number;   // max days it can move forward
  
  // Damage calculation
  damagePerStream: number;
  bossHP: number;
  currentHP: number;
  
  // For percentile calculation
  participants: Map<userId, streamCount>;
};
```

Would require a small backend (Supabase?) to:
- Store campaign definitions
- Aggregate participant streams
- Calculate percentiles
- Serve campaign status

---

## MVP Scope (Tonight)

1. Spotify OAuth flow working
2. Fetch top artists/tracks across time ranges
3. Artist search + focus mode
4. Basic stats calculation
5. One card template generating
6. PNG export working

## Stretch (If Flowing)

- Multiple card templates
- Badge system
- Theme switcher
- Instagram story dimensions
- Share-to-Twitter with preview

## Future (Not Tonight)

- Campaign mode with backend
- Last.fm integration for historical depth
- Artist dashboard (see your fans' cards)
- Leaderboards
- Apple Music support

---

## File Structure
```
devotion-verified/
├── index.html
├── styles.css
├── js/
│   ├── app.js           # Main app logic
│   ├── spotify.js       # OAuth + API calls
│   ├── analysis.js      # Data processing + badge calculation
│   ├── cards.js         # Card generation templates
│   └── export.js        # html2canvas + download
├── assets/
│   ├── badges/          # Badge icons
│   └── textures/        # Card backgrounds
└── README.md
```

---

## Notes

- Spotify API rate limits: 100 requests per minute (plenty for our use)
- Top artists/tracks time_range: short (~4 weeks), medium (~6 months), long (~years)
- Recently played only goes back 50 tracks—not great for historical depth
- "Top X% of listeners" would need estimation heuristics or artist-provided data
- Keep cards Instagram-story friendly (1080x1920) as export option

---

*Let's see what develops between rounds.*