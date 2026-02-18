# xWall

xWall is an open-source social engagement display system designed for communities and technical conferences. It aggregates real-time engagement from X (formerly Twitter) to create a visual feed for event venues, encouraging attendee participation and amplifying event visibility.

The system is architected to be a reliable, zero-cost alternative to enterprise social wall solutions, capable of running continuously during live events without requiring official API access.

## System Architecture

xWall operates as a decoupled system with two primary components:

1.  **Backend Ingestion Engine (Python)**:
    -   Leverages browser emulation to interface with X, bypassing API rate limits and costs.
    -   Implements an asynchronous event loop for concurrent data fetching and processing.
    -   Features intelligent filtering to exclude retweets, replies, and duplicate content.
    -   Utilizes exponential backoff strategies to ensure resilience against network interruptions.

2.  **Frontend Display (Next.js)**:
    -   A high-performance React application built on Next.js 15.
    -   Connects to a Supabase PostgreSQL database for real-time content delivery.
    -   Renders content in a responsive masonry grid optimized for large-format displays and projectors.

## Key Capabilities

-   **Event-Optimized Reliability**: Engineered to run autonomously for the duration of an event, polling for updates at one-minute intervals.
-   **Content Curation**: Automatically filters noise to prioritize original, high-value community content.
-   **Infrastructure Independence**: runs on standard hardware or cloud instances with minimal resource requirements.
-   **Zero Operational Cost**: Eliminates recurring SaaS fees associated with commercial social wall platforms.

## Technical Stack

-   **Backend**: Python 3.12+, Twikit, Asyncio.
-   **Frontend**: Next.js 15, TypeScript, Tailwind CSS.
-   **Database**: Supabase (PostgreSQL).

## Deployment

### Prerequisites

-   Node.js 18 or higher
-   Python 3.10 or higher
-   Supabase Project Credentials

### Configuration

1.  Clone the repository:
    ```bash
    git clone https://github.com/kabillanta/xwall.git
    cd xwall
    ```

2.  Initialize environment variables:
    ```bash
    cp backend/.env.template backend/.env
    cp frontend/.env.template frontend/.env.local
    ```
    Populate the `.env` files with your Supabase credentials and target search terms (e.g., `@yourcommunityhandle`).

3.  Start the Ingestion Engine:
    ```bash
    cd backend
    pip install -r requirements.txt
    python scrapper.py
    ```

4.  Launch the Display Interface:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Access the display at `http://localhost:3000`.

## Display Engine: Sliding Window Playback

The social wall (`XWall` component) uses a sliding window algorithm to cycle through ingested posts on a single-card display. This section documents the design rationale and its suitability for small-to-medium events (tested against a 300-attendee meetup scenario).

### Algorithm

Posts are stored in a chronological array in memory. A window of fixed size slides forward through this array, displaying one post at a time with animated transitions.

| Parameter       | Default | Description                                      |
|-----------------|---------|--------------------------------------------------|
| `WINDOW_SIZE`   | 15      | Number of posts in the active window             |
| `STRIDE`        | 5       | Posts to advance when the window slides forward  |
| `POST_DURATION` | 8000 ms | Time each post remains on screen                 |
| `POLL_INTERVAL` | 60000 ms| Fallback polling interval for new posts          |
| `LOOP_TAIL`     | 50      | Number of recent posts to loop when caught up    |

**Window progression:**

```
Window 1: posts[0..14]
Window 2: posts[5..19]    (10 posts overlap with Window 1)
Window 3: posts[10..24]   (10 posts overlap with Window 2)
...
```

Each window has 66% overlap with the previous one. This is intentional: event attendees look at the display intermittently, so repeated posts maximize the chance that any given post is seen.

When the playback cursor reaches the end of the available posts, it resets to the last `LOOP_TAIL` posts and begins cycling again.

### Data Ingestion

Three ingestion channels feed posts into the display array:

1. **Initial fetch** -- on mount, all existing posts are loaded from Supabase in ascending chronological order.
2. **Realtime subscription** -- Supabase Postgres Changes (INSERT events on the `posts` table) push new posts to the client immediately.
3. **Periodic polling** -- a 60-second fallback poll catches anything the realtime channel may have missed.

All three paths deduplicate by `source_id` before appending.

### Capacity Analysis (300-Attendee Event)

Engagement assumptions based on typical tech community events:

- 5-15% of attendees post on X during the event
- 1-3 posts per engaged attendee over the event duration
- Expected volume: **30-135 posts** (realistic), up to **270 posts** (optimistic)

Timing characteristics for 100 posts:

- Time to display one full window: 15 posts x 8s = **120 seconds**
- Unique posts advanced per window slide: 5
- Time to complete a full pass: (100 / 5) x 120s = **~40 minutes**
- Loop cycle through last 50 posts: **~20 minutes**

For 200 posts, a full pass takes approximately 80 minutes. Both ranges are well within the typical 3-4 hour duration of a meetup.

**Memory:** The post array (`allPostsRef`) is unbounded but event-scale volumes (hundreds of posts) are negligible for a browser tab.

### Latency Characteristics

- **Best case:** A new post appears on screen within 8 seconds of insertion (if the playback cursor is near the end of the array and the new post is next in sequence).
- **Worst case:** If a new post arrives just as a fresh window begins, the cursor must finish the current 15-post window (~120 seconds) before advancing to it.
- **Average:** Roughly 60 seconds from insertion to display.

There is no priority queue -- new posts do not preempt the current window. They are appended to the end of the array and displayed when the window reaches them.

### Known Limitations

- **Single-card display:** Only one post is visible at any time. For larger venues, a multi-card grid layout would increase throughput.
- **Simulated engagement metrics:** Like, retweet, reply, and view counts shown on cards are deterministically generated from the post index, not sourced from X. They serve as visual filler.
- **No manual moderation queue:** All posts that pass the scraper filters (no retweets, no replies, no self-mentions) are displayed without human review.
- **No adaptive pacing:** The display speed is fixed at 8 seconds per post regardless of post volume. A high-volume burst does not accelerate the display.

### Tuning for Different Event Sizes

For larger events or higher engagement rates, adjust the constants in `XWall.tsx`:

- **Reduce `POST_DURATION`** (e.g., 5000 ms) to cycle faster through a backlog.
- **Increase `STRIDE`** to reduce overlap and show unique content faster at the cost of fewer repeat impressions.
- **Increase `LOOP_TAIL`** if the event runs long and you want the idle loop to cover more historical posts.
- **Decrease `WINDOW_SIZE`** if you want tighter, faster windows with less overlap.

## License

This project is licensed under the MIT License.
