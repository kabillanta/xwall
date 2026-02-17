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

## License

This project is licensed under the MIT License.
