"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  LayoutGrid,
  MonitorPlay,
  Hash,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { RealtimeChannel } from "@supabase/supabase-js";

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

interface SyncPayload {
  windowStart: number;
  indexInWindow: number;
  globalIndex: number;
  totalPosts: number;
  windowSize: number;
  windowNumber: number;
  displayTweet: Tweet;
  isPaused?: boolean;
  timestamp?: number;
}

export default function AdminBoard() {
  const [state, setState] = useState<SyncPayload | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newChannel = supabase.channel("admin-sync");

    newChannel
      .on("broadcast", { event: "sync" }, (payload) => {
        setState(payload.payload);
        setLastSync(new Date());
        setProgress(0); // Reset progress on new post
      })
      .on("broadcast", { event: "sync_status" }, (payload) => {
        setState((prev) =>
          prev ? { ...prev, isPaused: payload.payload.isPaused } : null,
        );
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setChannel(newChannel);
        }
      });

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, []);

  // Smooth progress bar animation
  useEffect(() => {
    if (!state || state.isPaused) return;

    const POST_DURATION = 8000; // 8 seconds in ms
    let animationFrameId: number;

    const updateProgress = () => {
      if (!state.timestamp) return;

      const elapsed = Date.now() - state.timestamp;
      const newProgress = Math.min((elapsed / POST_DURATION) * 100, 100);

      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  const sendCommand = (action: string, targetIndex?: number) => {
    if (!channel) return;
    channel.send({
      type: "broadcast",
      event: "control",
      payload: { action, targetIndex },
    });
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-muted/30 p-8 flex flex-col items-center justify-center text-muted-foreground">
        <MonitorPlay className="h-12 w-12 mb-4 animate-pulse opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Waiting for Wall Sync...</h2>
        <p>Make sure the main display is open and running.</p>
      </div>
    );
  }

  const POST_DURATION = 8; // seconds
  const STRIDE = 5;
  const WINDOW_SIZE = 15;

  const postsRemainingInWindow = state.windowSize - state.indexInWindow;
  const timeRemainingInWindow = postsRemainingInWindow * POST_DURATION;

  // Rough estimate of total time remaining until loop
  const windowsRemaining = Math.ceil(
    (state.totalPosts - state.windowStart) / STRIDE,
  );
  const timeRemainingTotal = Math.max(
    0,
    (windowsRemaining - 1) * WINDOW_SIZE * POST_DURATION +
      timeRemainingInWindow,
  );

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Generate grid cells for visualization
  const cells = Array.from({ length: state.totalPosts }).map((_, i) => {
    const inWindow =
      i >= state.windowStart && i < state.windowStart + state.windowSize;
    const isCurrent = i === state.globalIndex;
    const isPast = i < state.globalIndex;

    return { id: i, inWindow, isCurrent, isPast };
  });

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Wall Admin Board
            </h1>
            <p className="text-muted-foreground mt-1">
              Live synchronization with main display
              {lastSync && (
                <span className="ml-2 text-xs opacity-70">
                  (Last sync: {lastSync.toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-500/20 px-3 py-1"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.totalPosts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently in database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Window
              </CardTitle>
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{state.windowNumber}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Post {state.indexInWindow + 1} of {state.windowSize}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Post Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.isPaused
                  ? "Paused"
                  : `${Math.max(0, Math.ceil(8 - (progress / 100) * 8))}s`}
              </div>
              <Progress value={progress} className="h-2 mt-3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Window Time Left
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.isPaused ? "Paused" : formatTime(timeRemainingInWindow)}
              </div>
              <Progress
                value={(state.indexInWindow / state.windowSize) * 100}
                className="h-2 mt-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cycle Time Left
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.isPaused ? "Paused" : formatTime(timeRemainingTotal)}
              </div>
              <Progress
                value={(state.globalIndex / state.totalPosts) * 100}
                className="h-2 mt-3"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="col-span-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Visual Playback State</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" /> Current Post
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30" />{" "}
                  In Current Window
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-muted" /> Pending
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => sendCommand("prev")}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              {state.isPaused ? (
                <Button
                  variant="default"
                  size="icon"
                  onClick={() => sendCommand("play")}
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => sendCommand("pause")}
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => sendCommand("next")}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {cells.map((cell) => (
                <button
                  key={cell.id}
                  onClick={() => sendCommand("jump", cell.id)}
                  className={`
                    w-6 h-6 rounded-sm text-[10px] flex items-center justify-center font-mono transition-all duration-300 hover:scale-110 hover:ring-2 hover:ring-primary/50 cursor-pointer
                    ${
                      cell.isCurrent
                        ? "bg-primary text-primary-foreground scale-110 shadow-md z-10"
                        : cell.inWindow
                          ? "bg-primary/20 border border-primary/30 text-foreground/70"
                          : cell.isPast
                            ? "bg-muted/50 text-muted-foreground/40"
                            : "bg-muted text-muted-foreground/60"
                    }
                  `}
                  title={`Jump to Post ${cell.id + 1}`}
                >
                  {cell.id + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {state.displayTweet && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Currently Displaying
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {state.displayTweet.avatar_url && (
                  <div className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.displayTweet.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  </div>
                )}
                <div>
                  <div className="font-bold">
                    {state.displayTweet.author_name}{" "}
                    <span className="text-muted-foreground font-normal">
                      {state.displayTweet.author_handle}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{state.displayTweet.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
