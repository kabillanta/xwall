"""
============================================================
 xScrapper v2 — Production-Ready Twitter/X Mention Listener
============================================================
 Powered by twikit (no API key needed)
 Features:
   - Async architecture with proper event loop
   - ZERO password storage — uses browser cookies
   - Environment-variable config via .env
   - Supabase SDK (REST API over HTTPS)
   - Exponential backoff retry on failures
   - Deduplication via ON CONFLICT
   - Retweet & self-mention filtering
   - Structured logging with timestamps
============================================================
"""

import os
import sys
import json
import asyncio
import logging
import datetime
from pathlib import Path

from supabase import create_client, Client as SupabaseClient
from dotenv import load_dotenv
from twikit import Client

# ==========================================
# LOGGING SETUP
# ==========================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("scrapper.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("xScrapper")


# ==========================================
# CONFIGURATION (from .env)
# ==========================================

load_dotenv()

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_KEY         = os.getenv("SUPABASE_KEY")
SEARCH_TERM          = os.getenv("SEARCH_TERM", "@replit")
MY_USERNAME          = os.getenv("MY_USERNAME", "replit")
CHECK_INTERVAL       = int(os.getenv("CHECK_INTERVAL", "60"))
BATCH_SIZE           = int(os.getenv("BATCH_SIZE", "15"))

COOKIES_FILE = Path(__file__).parent / "cookies.json"

# Retry settings
MAX_RETRIES    = 3
BASE_DELAY     = 2  # seconds, doubles each retry

# ==========================================
# DATABASE — Supabase Client
# ==========================================

supabase: SupabaseClient = None


def init_db():
    """Initialize the Supabase client."""
    global supabase
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.critical(
            "SUPABASE_URL and SUPABASE_KEY not set! "
            "Please fill them in your .env file."
        )
        sys.exit(1)
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info(f"✅ Connected to Supabase: {SUPABASE_URL}")
    except Exception as e:
        logger.critical(f"Failed to connect to Supabase: {e}")
        sys.exit(1)


# ==========================================
# RETRY HELPER
# ==========================================

async def retry_async(coro_func, *args, description="operation", **kwargs):
    """
    Retry an async callable with exponential backoff.
    Returns the result on success, or None after MAX_RETRIES failures.
    """
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return await coro_func(*args, **kwargs)
        except Exception as e:
            delay = BASE_DELAY ** attempt
            logger.warning(
                f"[Retry {attempt}/{MAX_RETRIES}] {description} failed: {e}. "
                f"Retrying in {delay}s..."
            )
            if attempt == MAX_RETRIES:
                logger.error(f"{description} failed after {MAX_RETRIES} attempts.")
                return None
            await asyncio.sleep(delay)


# ==========================================
# TWIKIT CLIENT — Cookie-Based Auth (NO PASSWORD)
# ==========================================

client = Client("en-US")


def extract_cookies_from_browser() -> dict | None:
    """
    Extract Twitter/X cookies from the user's browser.
    Tries Chrome first, then Firefox, then Edge.
    Requires: pip install browser-cookie3
    """
    try:
        import browser_cookie3
    except ImportError:
        logger.warning("browser-cookie3 not installed. Run: pip install browser-cookie3")
        return None

    browsers = [
        ("Chrome",  browser_cookie3.chrome),
        ("Firefox", browser_cookie3.firefox),
        ("Edge",    browser_cookie3.edge),
    ]

    for name, browser_fn in browsers:
        try:
            cookie_jar = browser_fn(domain_name=".x.com")
            cookies = {c.name: c.value for c in cookie_jar if "x.com" in c.domain or "twitter.com" in c.domain}
            if cookies and ("auth_token" in cookies or "ct0" in cookies):
                logger.info(f"✅ Extracted {len(cookies)} cookies from {name}")
                return cookies
        except Exception as e:
            logger.debug(f"{name} cookie extraction failed: {e}")
            continue

    return None


def prompt_manual_cookies() -> dict | None:
    """
    Fallback: ask user to paste cookies manually.
    They can get these from browser DevTools > Application > Cookies.
    """
    print("\n" + "=" * 55)
    print("  🍪 MANUAL COOKIE SETUP")
    print("=" * 55)
    print("  We need 2 cookies from your browser. Here's how:")
    print("  1. Go to x.com and make sure you're logged in")
    print("  2. Press F12 → Application tab → Cookies → x.com")
    print("  3. Find and copy these 2 values:\n")
    print("     • auth_token")
    print("     • ct0")
    print("=" * 55)

    auth_token = input("\n  Paste auth_token: ").strip()
    ct0 = input("  Paste ct0: ").strip()

    if auth_token and ct0:
        return {"auth_token": auth_token, "ct0": ct0}

    logger.error("Both cookies are required.")
    return None


async def authenticate():
    """
    Authenticate with Twitter/X — NO PASSWORD NEEDED.
    Priority:
      1. Load previously saved cookies.json
      2. Extract cookies from browser automatically
      3. Manual cookie paste (fallback)
    """

    # --- Priority 1: Saved cookies from last run ---
    if COOKIES_FILE.exists():
        try:
            client.load_cookies(str(COOKIES_FILE))
            logger.info("🔐 Loaded saved cookies — no login needed.")
            return True
        except Exception as e:
            logger.warning(f"Saved cookie load failed ({e}), trying browser extraction...")

    # --- Priority 2: Auto-extract from browser ---
    cookies = extract_cookies_from_browser()

    # --- Priority 3: Manual paste ---
    if not cookies:
        logger.info("Auto-extraction failed. Falling back to manual cookie input.")
        cookies = prompt_manual_cookies()

    if not cookies:
        logger.critical("No cookies available. Cannot authenticate.")
        return False

    # Set cookies on the twikit client and save for future runs
    try:
        client.set_cookies(cookies)
        client.save_cookies(str(COOKIES_FILE))
        logger.info("🔐 Cookies set and saved. Authenticated!")
        return True
    except Exception as e:
        logger.critical(f"Failed to set cookies: {e}")
        return False


# ==========================================
# DATABASE — Save Post (Supabase SDK)
# ==========================================

def save_post_to_db(post_data: dict) -> bool:
    """
    Insert a post into the database via Supabase SDK.
    Uses upsert with ignoreDuplicates to skip existing records.
    Returns True if a new row was inserted.
    """
    try:
        result = (
            supabase.table("xwall")
            .upsert(post_data, on_conflict="source_id", ignore_duplicates=True)
            .execute()
        )
        if result.data:
            logger.info(
                f"✅ NEW mention saved — @{post_data['author_handle']}: "
                f"{post_data['content'][:60]}..."
            )
            return True
        else:
            logger.debug(f"⏭️  Duplicate skipped: {post_data['source_id']}")
            return False
    except Exception as e:
        logger.error(f"DB insert error: {e}")
        return False


# ==========================================
# MEDIA EXTRACTION HELPER
# ==========================================

def extract_media_url(tweet) -> str | None:
    """Extract the first media URL from a tweet (photo > video thumbnail)."""
    if not tweet.media:
        return None
    first_media = tweet.media[0]
    # Photo: use media_url directly
    if hasattr(first_media, "media_url") and first_media.media_url:
        return first_media.media_url
    # Video/GIF: use the thumbnail or media_url
    if hasattr(first_media, "media_url"):
        return first_media.media_url
    return None


# ==========================================
# CORE — Fetch & Process Mentions
# ==========================================

async def fetch_and_process():
    """
    Search for mentions of SEARCH_TERM, filter, and save to DB.
    """
    logger.info(f"🔍 Searching for mentions of: {SEARCH_TERM}")

    async def _search():
        return await client.search_tweet(SEARCH_TERM, "Latest", count=BATCH_SIZE)

    tweets = await retry_async(_search, description="Tweet search")

    if not tweets:
        logger.info("No tweets found in this cycle.")
        return

    new_count = 0
    skipped_count = 0

    for tweet in tweets:
        # --- FILTERS ---

        # 1. Skip retweets
        if tweet.retweeted_tweet is not None:
            skipped_count += 1
            continue

        # 2. Skip replies (only keep original posts)
        if tweet.in_reply_to is not None:
            skipped_count += 1
            continue

        # 3. Skip quote tweets
        if tweet.is_quote_status:
            skipped_count += 1
            continue

        # 4. Skip self-mentions (your own tweets)
        if tweet.user and tweet.user.screen_name and \
           tweet.user.screen_name.lower() == MY_USERNAME.lower():
            skipped_count += 1
            skipped_count += 1
            continue

        # --- BUILD PAYLOAD ---
        source_id = f"https://x.com/{tweet.user.screen_name}/status/{tweet.id}" if tweet.user else tweet.id

        post_payload = {
            "source_id":       source_id,
            "content":         tweet.text or "",
            "author_name":     tweet.user.name if tweet.user else "Unknown",
            "author_handle":   tweet.user.screen_name if tweet.user else "unknown",
            "avatar_url":      tweet.user.profile_image_url if tweet.user else None,
            "media_url":       extract_media_url(tweet),
            "platform":        "twitter",
            "status":          "PENDING",
        }

        if save_post_to_db(post_payload):
            new_count += 1

    logger.info(
        f"📊 Cycle complete — {new_count} new, {skipped_count} skipped "
        f"(retweets/self), {len(tweets) - new_count - skipped_count} duplicates"
    )


# ==========================================
# MAIN — Async Event Loop
# ==========================================

async def main():
    """Main entry point: authenticate, init DB, then poll."""

    print(r"""
    ╔═══════════════════════════════════════════╗
    ║       xScrapper v2 — Mention Listener     ║
    ║       Powered by twikit 🚀                ║
    ╚═══════════════════════════════════════════╝
    """)

    # 1. Initialize database
    init_db()

    # 2. Authenticate with Twitter/X
    authenticated = await authenticate()
    if not authenticated:
        logger.critical("Authentication failed. Exiting.")
        sys.exit(1)

    logger.info(f"🎯 Monitoring mentions of: {SEARCH_TERM}")
    logger.info(f"⏱️  Check interval: {CHECK_INTERVAL}s | Batch size: {BATCH_SIZE}")
    logger.info(f"🚫 Ignoring self-mentions from: @{MY_USERNAME}")
    logger.info("=" * 50)

    # 3. Polling loop
    cycle = 0
    while True:
        cycle += 1
        logger.info(f"── Cycle {cycle} ──")
        try:
            await fetch_and_process()
        except Exception as e:
            logger.error(f"Unexpected error in cycle {cycle}: {e}")

        logger.info(f"💤 Sleeping for {CHECK_INTERVAL}s...")
        await asyncio.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("🛑 Scrapper stopped by user.")
