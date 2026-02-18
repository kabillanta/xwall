# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

xWall is a social engagement display system for conferences/events. It scrapes X/Twitter mentions and displays them on a live social wall alongside an event agenda. Designed as a zero-cost alternative to enterprise social wall SaaS products.

## Architecture

Two decoupled components sharing a Supabase PostgreSQL database:

- **Backend** (`backend/scrapper.py`): Single-file Python async scraper using `twikit` (no API key needed — uses browser cookies). Polls X for mentions at configurable intervals, filters out retweets/replies/quotes/self-mentions, optionally filters negative content via VADER sentiment, and upserts to Supabase.
- **Frontend** (`frontend/`): Next.js 16 + React 19 app. Reads posts from Supabase and renders them in a display optimized for projectors/large screens. Layout: event agenda panel (left 4 cols) and social wall (right 8 cols).

Data flows one way: scraper → Supabase `posts` table → frontend display.

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (from `backend/`)
```bash
pip install twikit supabase python-dotenv   # Core deps (no requirements.txt yet)
pip install vaderSentiment browser-cookie3   # Optional: sentiment filtering, auto cookie extraction
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
- `frontend/components/XWall.tsx` — Social wall component (deleted from working tree but still imported in `page.tsx`)
- `frontend/lib/supabase.ts` — Supabase client singleton
- `frontend/components/ui/` — shadcn/ui component library (do not manually edit these)

## Tech Stack Details

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix primitives), Framer Motion, Supabase JS client
- **Backend**: Python 3.10+, twikit, supabase-py, asyncio, VADER sentiment (optional)
- **Database**: Supabase (PostgreSQL) — `posts` table with `source_id` as unique key for deduplication

## Known Issues

- `is_content_safe()` is called in `scrapper.py:328` but never defined — the scraper will crash when it reaches a tweet that passes all other filters
- `scrapper.py:324` has a duplicate `skipped_count += 1` in the self-mention filter block
- `XWall.tsx` is deleted from the working tree but `page.tsx` still imports it — the frontend will fail to compile without it (masked by `ignoreBuildErrors: true`)
- `next.config.ts` has `ignoreBuildErrors` and `ignoreDuringBuilds` set to true — TypeScript and ESLint errors won't block builds, so broken imports can go unnoticed

## Notes

- The scraper authenticates via browser cookies (no X API credentials needed). Cookie auth priority: saved `cookies.json` → auto-extract from browser → manual paste
- `cookies.json` and `.env` files are gitignored (and should stay that way)
- `next.config.ts` allows remote images from `*.twimg.com` for Twitter avatars/media
