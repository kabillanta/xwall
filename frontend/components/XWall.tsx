"use client";

import { Heart, MessageCircle, Repeat2, Bookmark, BarChart2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

// X (Twitter) logo SVG component
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface Tweet {
  id: string; // source_id or db id
  author_name: string;
  author_handle: string;
  avatar_url: string;
  content: string;
  media_url?: string;
  likes: number; // Mocked
  retweets: number; // Mocked
  replies: number; // Mocked
  views: string; // Mocked
  created_at?: string;
}

export function XWall() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch initial tweets
  useEffect(() => {
    async function fetchTweets() {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) {
        console.error("Error fetching tweets:", error);
        return;
      }

      if (data) {
        // Map DB fields to Tweet interface and add mock metrics
        const mappedTweets: Tweet[] = data.map((post: any) => ({
          id: post.id || post.source_id,
          author_name: post.author_name || "Unknown",
          author_handle: post.author_handle ? `@${post.author_handle}` : "@unknown",
          avatar_url: post.avatar_url || "",
          content: post.content || "",
          media_url: post.media_url,
          likes: Math.floor(Math.random() * 500) + 10,
          retweets: Math.floor(Math.random() * 100) + 5,
          replies: Math.floor(Math.random() * 50) + 2,
          views: (Math.random() * 10 + 1).toFixed(1) + "K",
          created_at: post.created_at
        }));
        setTweets(mappedTweets);
      }
    }

    fetchTweets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const newPost = payload.new as any;
          const newTweet: Tweet = {
            id: newPost.id || newPost.source_id,
            author_name: newPost.author_name || "Unknown",
            author_handle: newPost.author_handle ? `@${newPost.author_handle}` : "@unknown",
            avatar_url: newPost.avatar_url || "",
            content: newPost.content || "",
            media_url: newPost.media_url,
            likes: Math.floor(Math.random() * 500) + 10,
            retweets: Math.floor(Math.random() * 100) + 5,
            replies: Math.floor(Math.random() * 50) + 2,
            views: (Math.random() * 10 + 1).toFixed(1) + "K",
            created_at: newPost.created_at
          };
          
          setTweets((prev) => [newTweet, ...prev].slice(0, 15)); // Keep latest 15
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Rotation logic
  useEffect(() => {
    if (tweets.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tweets.length);
    }, 8000); // Slower rotation (8s) for better readability

    return () => clearInterval(timer);
  }, [tweets.length]);

  if (tweets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse">
        Waiting for posts...
      </div>
    );
  }

  const tweet = tweets[currentIndex];

  return (
    <div className="h-full w-full flex items-center justify-center p-6 relative overflow-hidden rounded-2xl border bg-card">

      <AnimatePresence mode="wait">
        <motion.div
          key={tweet.id}
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 1.03 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-xl"
        >
          {/* X Post Card — authentic look */}
          <div className="bg-background rounded-2xl border border-border shadow-lg overflow-hidden">
            <div className="p-6">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={tweet.avatar_url} />
                  <AvatarFallback>{tweet.author_name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[15px] text-foreground truncate">{tweet.author_name}</span>
                    {/* Verified badge */}
                    <svg viewBox="0 0 22 22" className="h-[18px] w-[18px] text-[#1D9BF0] fill-current shrink-0">
                      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.273 1.894.143.636-.13 1.22-.436 1.69-.882.445-.47.749-1.055.878-1.691.13-.634.08-1.29-.144-1.898.587-.271 1.084-.7 1.438-1.24.354-.54.551-1.169.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                    </svg>
                  </div>
                  <span className="text-[15px] text-muted-foreground">{tweet.author_handle}</span>
                </div>

                {/* X Logo */}
                <XLogo className="h-6 w-6 text-foreground shrink-0" />
              </div>

              {/* Post content */}
              <div className={`mt-4 leading-relaxed text-foreground break-words ${
                tweet.content.length < 100 ? "text-3xl font-medium" :
                tweet.content.length < 240 ? "text-xl" : "text-base"
              }`}>
                {tweet.content}
              </div>

              {/* Image */}
              {tweet.media_url && (
                <div className="mt-4 rounded-2xl overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tweet.media_url} alt="Post media" className="object-cover object-top w-full aspect-video" />
                </div>
              )}

              {/* Action bar — authentic X style */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t max-w-md">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#1D9BF0] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{tweet.replies}</span>
                </button>

                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#00BA7C] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#00BA7C]/10 transition-colors">
                    <Repeat2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{tweet.retweets}</span>
                </button>

                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#F91880] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#F91880]/10 transition-colors">
                    <Heart className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{tweet.likes}</span>
                </button>

                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-[#1D9BF0] transition-colors group">
                  <div className="p-1.5 rounded-full group-hover:bg-[#1D9BF0]/10 transition-colors">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm">{tweet.views}</span>
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

      <div className="absolute top-6 right-6 z-50">
        <div className="bg-background/80 backdrop-blur-sm border border-border/50 text-foreground px-3 py-1.5 rounded-full text-xs font-mono font-medium flex items-center gap-2 shadow-sm">
          <span>{currentIndex + 1}/{tweets.length}</span>
          <span className="text-muted-foreground/50">|</span>
          <span className="text-primary font-bold tabular-nums w-4 text-center"><Countdown key={currentIndex} duration={8} /></span>
        </div>
      </div>
      
      {/* Progress Bar with Google Colors */}
      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-muted/20">
        <motion.div
          key={currentIndex}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 8, ease: "linear" }}
          className="h-full"
          style={{ 
            backgroundColor: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58'][currentIndex % 4] 
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
