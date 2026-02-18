/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Heart, MessageCircle, Repeat2, Bookmark, BarChart2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

// --- Constants ---
const WINDOW_SIZE = 15;
const STRIDE = 5;
const POST_DURATION = 8000;
const POLL_INTERVAL = 60000;
const LOOP_TAIL = 50;

// --- X (Twitter) logo SVG component ---
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// --- Seeded mock metrics (stable across re-renders) ---
function seedMetrics(index: number) {
  // Simple hash from index for deterministic "random" values
  const h = ((index * 2654435761) >>> 0);
  return {
    likes: (h % 490) + 10,
    retweets: ((h >>> 8) % 95) + 5,
    replies: ((h >>> 16) % 48) + 2,
    views: (((h >>> 4) % 100) / 10 + 1).toFixed(1) + "K",
  };
}

interface Tweet {
  id: string;
  source_id: string;
  author_name: string;
  author_handle: string;
  avatar_url: string;
  content: string;
  media_url?: string;
  created_at: string;
}

function mapPost(post: any): Tweet {
  return {
    id: post.id || post.source_id,
    source_id: post.source_id || post.id,
    author_name: post.author_name || "Unknown",
    author_handle: post.author_handle ? `@${post.author_handle}` : "@unknown",
    avatar_url: post.avatar_url || "",
    content: post.content || "",
    media_url: post.media_url,
    created_at: post.created_at,
  };
}

export function XWall() {
  const allPostsRef = useRef<Tweet[]>([]);
  const [displayTweet, setDisplayTweet] = useState<Tweet | null>(null);
  const [positionLabel, setPositionLabel] = useState("");
  const [globalIndex, setGlobalIndex] = useState(0);

  // Mutable playback state in refs to avoid stale closures
  const windowStartRef = useRef(0);
  const indexInWindowRef = useRef(0);

  // Deduplicated append
  const appendPosts = useCallback((newPosts: Tweet[]) => {
    const existing = new Set(allPostsRef.current.map((t) => t.source_id));
    const unique = newPosts.filter((t) => !existing.has(t.source_id));
    if (unique.length > 0) {
      allPostsRef.current = [...allPostsRef.current, ...unique];
    }
  }, []);

  // --- Data fetching ---
  useEffect(() => {
    // Initial load: all posts, ascending
    async function fetchAll() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching posts:", error);
        return;
      }
      if (data && data.length > 0) {
        allPostsRef.current = data.map(mapPost);
      }
    }

    fetchAll();

    // Periodic poll for new posts
    const pollTimer = setInterval(async () => {
      const posts = allPostsRef.current;
      const lastCreatedAt = posts.length > 0 ? posts[posts.length - 1].created_at : null;

      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: true });

      if (lastCreatedAt) {
        query = query.gt("created_at", lastCreatedAt);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Poll error:", error);
        return;
      }
      if (data && data.length > 0) {
        appendPosts(data.map(mapPost));
      }
    }, POLL_INTERVAL);

    // Realtime subscription
    const channel = supabase
      .channel("xwall-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const newTweet = mapPost(payload.new);
          appendPosts([newTweet]);
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [appendPosts]);

  // --- Playback engine ---
  useEffect(() => {
    const tick = () => {
      const posts = allPostsRef.current;

      if (posts.length === 0) {
        setDisplayTweet(null);
        setPositionLabel("");
        return;
      }

      const ws = windowStartRef.current;
      const iw = indexInWindowRef.current;
      const currentWindow = posts.slice(ws, ws + WINDOW_SIZE);

      if (currentWindow.length === 0) {
        // Edge case: windowStart beyond array (shouldn't happen, but reset)
        windowStartRef.current = 0;
        indexInWindowRef.current = 0;
        return;
      }

      // Clamp indexInWindow to current window size
      const safeIndex = Math.min(iw, currentWindow.length - 1);
      const windowNumber = Math.floor(ws / STRIDE) + 1;

      setDisplayTweet(currentWindow[safeIndex]);
      setGlobalIndex(ws + safeIndex);
      setPositionLabel(`${safeIndex + 1}/${currentWindow.length} · Window ${windowNumber}`);

      // Advance
      const nextIW = safeIndex + 1;
      if (nextIW < currentWindow.length) {
        indexInWindowRef.current = nextIW;
      } else {
        // Window complete — advance or loop
        const nextStart = ws + STRIDE;
        if (nextStart + WINDOW_SIZE <= posts.length) {
          // Enough posts ahead to fill a full window
          windowStartRef.current = nextStart;
          indexInWindowRef.current = 0;
        } else if (nextStart < posts.length) {
          // Partial window ahead — still advance to show remaining posts
          windowStartRef.current = nextStart;
          indexInWindowRef.current = 0;
        } else {
          // Caught up — loop
          if (posts.length > LOOP_TAIL) {
            windowStartRef.current = posts.length - LOOP_TAIL;
          } else {
            windowStartRef.current = 0;
          }
          indexInWindowRef.current = 0;
        }
      }
    };

    // Run first tick immediately
    tick();

    const timer = setInterval(tick, POST_DURATION);
    return () => clearInterval(timer);
  }, []);

  // --- Empty state ---
  if (!displayTweet) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
        Waiting for posts...
      </div>
    );
  }

  const metrics = seedMetrics(globalIndex);

  return (
    <div className="h-full w-full flex items-center justify-center p-6 relative overflow-hidden rounded-2xl border bg-card">
      <AnimatePresence mode="wait">
        <motion.div
          key={displayTweet.source_id + "-" + globalIndex}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 1.03 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-xl"
        >
          {/* X Post Card */}
          <div className="bg-background rounded-2xl border border-border shadow-lg overflow-hidden">
            <div className="p-6">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={displayTweet.avatar_url} />
                  <AvatarFallback>{displayTweet.author_name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[15px] text-foreground truncate">
                      {displayTweet.author_name}
                    </span>
                    {/* Verified badge */}
                    <svg
                      viewBox="0 0 22 22"
                      className="h-[18px] w-[18px] text-[#1D9BF0] fill-current shrink-0"
                    >
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.273 1.894.143.636-.13 1.22-.436 1.69-.882.445-.47.749-1.055.878-1.691.13-.634.08-1.29-.144-1.898.587-.271 1.084-.7 1.438-1.24.354-.54.551-1.169.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-muted-foreground">
                    {displayTweet.author_handle}
                  </span>
                </div>

                {/* X Logo */}
                <XLogo className="h-6 w-6 text-foreground shrink-0" />
              </div>

              {/* Post content */}
              <div
                className={`mt-4 leading-relaxed text-foreground break-words ${
                  displayTweet.content.length < 100
                    ? "text-3xl font-medium"
                    : displayTweet.content.length < 240
                      ? "text-xl"
                      : "text-base"
                }`}
              >
                {displayTweet.content}
              </div>

              {/* Image */}
              {displayTweet.media_url && (
                <div className="mt-4 rounded-2xl overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayTweet.media_url}
                    alt="Post media"
                    className="object-cover object-top w-full aspect-video"
                  />
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t max-w-md">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#1D9BF0] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{metrics.replies}</span>
                </button>

                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#00BA7C] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#00BA7C]/10 transition-colors">
                    <Repeat2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{metrics.retweets}</span>
                </button>

                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#F91880] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#F91880]/10 transition-colors">
                    <Heart className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{metrics.likes}</span>
                </button>

                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#1D9BF0] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{metrics.views}</span>
                </button>

                <button className="text-muted-foreground hover:text-[#1D9BF0] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
                    <Bookmark className="h-5 w-5" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Position indicator */}
      <div className="absolute top-6 right-6 z-50">
        <div className="bg-background/80 backdrop-blur-sm border border-border/50 text-foreground px-3 py-1.5 rounded-full text-xs font-mono font-medium flex items-center gap-2 shadow-sm">
          <span>{positionLabel}</span>
          <span className="text-muted-foreground/50">|</span>
          <span className="text-primary font-bold tabular-nums w-4 text-center">
            <Countdown key={globalIndex} duration={8} />
          </span>
        </div>
      </div>

      {/* Progress Bar with Google Colors */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-muted/20">
        <motion.div
          key={globalIndex}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 8, ease: "linear" }}
          className="h-full"
          style={{
            backgroundColor: ["#4285F4", "#DB4437", "#F4B400", "#0F9D58"][globalIndex % 4],
          }}
        />
      </div>
    </div>
  );
}

function Countdown({ duration }: { duration: number }) {
  const [count, setCount] = useState(duration);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span>{count}s</span>;
}
