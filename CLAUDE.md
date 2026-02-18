# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xWall is a social engagement display system for conferences/events. It scrapes X/Twitter mentions and displays them on a live social wall alongside an event agenda. Designed as a zero-cost alternative to enterprise social wall SaaS products. Validated for events up to approximately 300 attendees.

## Architecture

Two fully decoupled components sharing a Supabase PostgreSQL database. The frontend and backend have no direct dependency — either can be restarted independently without affecting the other.

- **Backend** (`backend/scrapper.py`): Single-file Python async scraper using `twikit` (no API key needed — uses browser cookies). Polls X for mentions at configurable intervals, filters out retweets/replies/quotes/self-mentions, and upserts to Supabase.
- **Frontend** (`frontend/`): Next.js 16 + React 19 app. Reads posts from Supabase and renders them in a display optimized for projectors/large screens. Layout: event agenda panel (left 4 cols) and social wall (right 8 cols).

Data flows one way: scraper → Supabase `posts` table → frontend display.

## Display Engine: Sliding Window Playback

The `XWall` component (`frontend/components/XWall.tsx`) uses a sliding window algorithm to cycle through posts one at a time with animated transitions.

**Constants (all in `XWall.tsx`):**
- `WINDOW_SIZE = 15` — posts per active window
- `STRIDE = 5` — posts to advance when the window slides (66% overlap between windows)
- `POST_DURATION = 8000` — milliseconds each post stays on screen
- `POLL_INTERVAL = 60000` — fallback DB polling interval in ms
- `LOOP_TAIL = 50` — recent posts to loop through when the cursor catches up to the end

**Window progression:** Window N starts at `STRIDE * (N-1)`. Each window overlaps the previous by `WINDOW_SIZE - STRIDE` posts. Overlap is intentional for event displays where attendees glance intermittently.

**Data ingestion into the display array has three channels:**
1. Initial full fetch from Supabase on mount (ascending chronological order)
2. Supabase realtime subscription (INSERT events on the `posts` table)
3. 60-second fallback poll for anything realtime missed

All paths deduplicate by `source_id` before appending to the in-memory array.

**Timing at event scale (~100 posts):**
- One full window: 15 x 8s = 120s
- Full pass through all posts: ~40 min
- Loop cycle (last 50): ~20 min

**New-post latency:** 8 seconds best case, ~120 seconds worst case (cursor just started a fresh window). No priority insertion — new posts queue at the end of the array.

**Engagement metrics** (likes, retweets, replies, views) displayed on cards are deterministically generated fakes via `seedMetrics()`, not sourced from X.

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev      
npm run build    
npm run lint     
```

### Backend (from `backend/`)
```bash
pip install -r requirements.txt             # All deps (core + optional)
python scrapper.py                           # Start the polling scraper
```

No test suite exists yet for either component.

## Environment Setup

Both components need `.env` files — copy from templates:
- `backend/.env` from `backend/.env.template` (Supabase creds, search term, username, poll interval)
- `frontend/.env.local` from `frontend/.env.template` (Supabase URL + anon key as `NEXT_PUBLIC_*`)

## Key Frontend Files

- `frontend/app/page.tsx` — Main dashboard layout (logo, agenda panel, social wall, footer)
- `frontend/components/Agenda.tsx` — Event schedule with live time tracking (agenda data is hardcoded in the `AGENDA` array)
- `frontend/components/XpostCard.tsx` — Contains `XPostCard` (static demo card) and `XComposer` (unused tweet composer); neither is wired to Supabase yet
- `frontend/components/XWall.tsx` — Social wall: sliding window playback engine, realtime subscription, single-card animated display
- `frontend/lib/supabase.ts` — Supabase client singleton
- `frontend/components/ui/` — shadcn/ui component library (do not manually edit these)

## Tech Stack Details

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives), Framer Motion, Supabase JS client
- **Backend**: Python 3.10+, twikit, supabase-py, asyncio, VADER sentiment (optional)
- **Database**: Supabase (PostgreSQL) — `posts` table with `source_id` as unique key for deduplication

## Known Issues

- `is_content_safe()` is called in `scrapper.py:328` but never defined — the scraper will crash when it reaches a tweet that passes all other filters. Must be fixed (remove the call or add a stub) before running at an event.
- `scrapper.py:324` has a duplicate `skipped_count += 1` in the self-mention filter block
- `next.config.ts` has `ignoreBuildErrors` and `ignoreDuringBuilds` set to true — TypeScript and ESLint errors won't block builds, so broken imports can go unnoticed
- Engagement metrics on displayed cards are fake (seeded from array index). Attendees may notice.
- No moderation queue — all posts passing scraper filters go straight to the display without human review
- The in-memory post array (`allPostsRef`) is never trimmed. Not a problem at event scale (hundreds of posts) but technically unbounded.
- Deleting a post from Supabase does not remove it from the frontend's in-memory array — a browser refresh is required after manual deletions.

## Cookie Authentication

- The scraper authenticates via browser cookies (no X API credentials needed). Cookie auth priority: saved `cookies.json` → auto-extract from browser → manual paste.
- `auth_token` cookies from X are issued with a 1-year expiry but can be invalidated at any time by: changing X password, logging out, account suspension, or X's anti-automation enforcement.
- Twikit uses X's private/undocumented endpoints (not the public v2 API). X can detect automated access patterns (fixed-interval polling, no browser telemetry, concurrent sessions with same token). Risk is low for a single-day, single-term scraper but not zero.
- If the scraper's auth fails mid-event: stop the scraper, delete `cookies.json`, ensure you're logged into X in a browser on the same machine, restart the scraper. The frontend continues cycling its cached posts uninterrupted and picks up new posts automatically once the scraper resumes inserting.
- `cookies.json` and `.env` files are gitignored (and should stay that way).

## Display Tuning

Adjust constants in `XWall.tsx` based on event volume:
- **High volume / backlog:** reduce `POST_DURATION` (e.g., 5000ms) to cycle faster
- **Too much repetition:** increase `STRIDE` (e.g., 10 or 15) to reduce overlap
- **Longer idle loops:** increase `LOOP_TAIL` beyond 50
- **Faster windows:** decrease `WINDOW_SIZE`

## Notes

- `next.config.ts` allows remote images from `*.twimg.com` for Twitter avatars/media
- Frontend and backend are fully independent at runtime — restarting the scraper does not affect the frontend's playback cycle, and vice versa
- The frontend browser tab must remain in the foreground on the projector machine; backgrounded tabs get their `setInterval` throttled by the browser
