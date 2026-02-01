# CLAUDE.md — seeds/devotion-verified/

Spotify-based devotion verification tool. Prove your listening depth for specific artists or genres.

---

## What This Is

Web app that uses Spotify OAuth to analyze listening history and generate shareable proof of devotion. Two modes:
1. **Artist Deep Dive** - Prove loyalty to a specific artist (tracks played, hours listened)
2. **Profile Mode** - Generate top artists/genres summary (Spotify Wrapped-style)

**Core concept:** Quantify and share musical devotion. Generates shareable summary images.

---

## Tech Stack

**Frontend:**
- Vanilla JavaScript (ES6 modules)
- HTML/CSS
- Cinzel + Inter fonts (gothic aesthetic)

**OAuth:**
- Spotify Web API
- OAuth 2.0 authorization code flow with PKCE
- Callback handling (Vercel deployment)

**Deployment:**
- Vercel (static hosting + OAuth callback endpoint)
- vercel.json configuration

---

## How to Run Locally

```bash
cd /Users/rayheberer/Documents/greattomb/seeds/devotion-verified
# Open index.html in browser for basic testing
# Note: Spotify OAuth requires deployed callback URL
# For full testing, deploy to Vercel or configure local callback
```

**Spotify OAuth Setup:**
1. Create Spotify app at https://developer.spotify.com/dashboard
2. Add redirect URI (e.g., https://your-app.vercel.app/callback)
3. Get client ID
4. Configure in `js/spotify-auth.js`

---

## Current State

**Status:** Seed project - functional prototype, recent updates

**Last Activity:** December 2024
- 220cbbc Allow disconnecting
- 064f12b Add logging, auto scroll tweak

**Features:**
- ✅ Spotify OAuth with PKCE
- ✅ Artist deep dive (specific artist stats)
- ✅ Profile mode (top artists/genres)
- ✅ Shareable summary generation
- ✅ Disconnect/reconnect flow
- ✅ Dark aesthetic (Cinzel font, gothic vibes)

**Deployment:**
- Vercel deployment configured
- OAuth callback endpoint at /callback

---

## Key Files

**Main:**
- `index.html` - Landing page, mode selection
- `callback/index.html` - OAuth callback handler
- `styles.css` - Dark gothic aesthetic

**JavaScript:**
- `js/spotify-auth.js` - OAuth flow, PKCE implementation
- `js/app.js` - Main app logic
- `js/screens/` - Screen components (landing, artist, profile, summary)

**Config:**
- `vercel.json` - Vercel deployment configuration
- `IMPLEMENTATION_PROMPT.md` - Original spec

**Assets:**
- `assets/` - Icons, images (if any)

---

## Patterns & Conventions

**OAuth Flow:**
1. User clicks "Connect Spotify"
2. Redirect to Spotify authorization page (with PKCE challenge)
3. Spotify redirects to /callback with auth code
4. Exchange code for access token
5. Fetch user's listening data
6. Display stats + generate summary

**PKCE (Proof Key for Code Exchange):**
Used for secure OAuth in browser without client secret. Prevents authorization code interception.

**Data Sources:**
- Spotify Web API endpoints:
  - `/v1/me/top/artists` - Top artists
  - `/v1/me/top/tracks` - Top tracks
  - `/v1/artists/{id}/top-tracks` - Artist-specific tracks

**Summary Generation:**
Creates visual summary card (HTML/CSS rendered, screenshot or share)

---

## Notes

**Use Case:**
Share proof of musical devotion on social media. "I've listened to [Artist] for X hours" flex.

**Audience:**
Music fans, metalheads, band communities. Could integrate with Megan Ash brand (metal violin fans proving devotion).

**Deployment:**
Requires Spotify app credentials and OAuth callback URL. Vercel deployment simplifies this.

**Status:**
Seed project = functional, not actively promoted. Could be deployed/marketed if desired.

**Privacy:**
Only accesses data user explicitly grants via Spotify OAuth. No data stored server-side.

---

*Seed project. Spotify devotion proof generator. Recent updates suggest potential activation. Could tie into Megan Ash brand or broader music community tools.*
