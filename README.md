# xWall

xWall is an open-source social engagement display system designed for communities and technical conferences. It aggregates real-time engagement from X (formerly Twitter) to create a visual feed for event venues, encouraging attendee participation and amplifying event visibility.

The system is architected to be a reliable, zero-cost alternative to enterprise social wall solutions, capable of running continuously during live events without requiring official API access.

## System Architecture

xWall operates as a decoupled system with three primary components:

1.  **Backend Ingestion Engine (Python)**:
    - Leverages browser emulation (Twikit) to interface with X, bypassing API rate limits and costs.
    - Implements an asynchronous event loop for concurrent data fetching and processing.
    - Features intelligent filtering to exclude retweets, replies, and duplicate content.
    - Utilizes exponential backoff strategies and structured logging for production reliability.

2.  **Frontend Social Wall (Next.js)**:
    - A high-performance React application built on Next.js 16 and React 19.
    - Renders content in a dual-panel layout: a live Event Agenda (left) and a Social Wall (right).
    - Uses a sliding window algorithm for smooth, animated post cycling.

3.  **Wall Admin Board**:
    - A dedicated administrative interface for real-time orchestration.
    - Features remote controls (Play/Pause/Skip/Jump) that synchronize instantly with the main display.
    - Provides a live moderation queue to block/unblock content on the fly.

## Key Capabilities

- **Real-Time Synchronization**: Backend, database, and multiple frontend instances stay in sync via Supabase Realtime (Postgres Changes and Broadcast).
- **Content Moderation**: Admin dashboard allows instant blocking of inappropriate content, which immediately skips on the live wall.
- **Remote Orchestration**: Control the wall's playback from any mobile device or laptop via the Admin Board.
- **Live Event Agenda**: Displays the current schedule with automatic highlighting of active sessions based on local time.
- **Autonomous Reliability**: Engineered to run for 8+ hours unattended, with polling fallbacks for network resilience.
- **Zero Operational Cost**: Eliminates SaaS fees; runs on standard hardware or cloud free-tiers.

## Technical Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, shadcn/ui.
- **Backend**: Python 3.10+, Twikit, Asyncio.
- **Database/Realtime**: Supabase (PostgreSQL + Realtime).

## Deployment

### Prerequisites

- Node.js 18 or higher
- Python 3.10 or higher
- Supabase Project Credentials

### Configuration

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/kabillanta/xwall.git
    cd xwall
    ```

2.  **Initialize environment variables**:

    ```bash
    cp backend/.env.template backend/.env
    cp frontend/.env.template frontend/.env.local
    ```

    Populate the `.env` files with your Supabase credentials, target `SEARCH_TERM` (e.g., `@replit`), and `MY_USERNAME`.

3.  **Start the Ingestion Engine**:

    ```bash
    cd backend
    pip install -r requirements.txt
    python scrapper.py
    ```

4.  **Launch the Display & Admin**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

    - **Live Wall**: `http://localhost:3000`
    - **Admin Board**: `http://localhost:3000/admin`

## Detailed Component Documentation

### Display Engine (Social Wall)

The social wall uses a sliding window algorithm to cycle through ingested posts.

| Parameter       | Default | Description                                     |
| --------------- | ------- | ----------------------------------------------- |
| `WINDOW_SIZE`   | 15      | Number of posts in the active window            |
| `STRIDE`        | 5       | Posts to advance when the window slides forward |
| `POST_DURATION` | 8000 ms | Time each post remains on screen                |
| `LOOP_TAIL`     | 50      | Number of recent posts to loop when caught up   |

**Engagement metrics** (likes, retweets, views) shown on cards are deterministically generated fakes to provide visual "social" filler without additional API calls.

### Wall Admin Board

The admin panel (`/admin`) allows for:

- **Visual Playback Control**: Jump to any post in the sequence by clicking its index.
- **Live Sync**: Uses Supabase Broadcast to send control signals (play, pause, next, prev) to all connected displays.
- **Moderation**: View the last 100 posts. "Block" buttons immediately update the post status in the DB and trigger a skip on the display.

### Backend Scrapper v2

The scraper authenticates via browser cookies, removing the need for developer API keys.

- **Priority Auth**: `cookies.json` → Browser extraction → Manual paste.
- **Filtering**: Automatically drops retweets, replies, quotes, and self-mentions.
- **Deduplication**: Uses `ON CONFLICT` on `source_id` to ensure database integrity.

## License

This project is licensed under the MIT License.
