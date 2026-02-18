/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, BarChart2, Image, Smile, MapPin, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export function XComposer() {
  const [content, setContent] = useState("");

  return (
    <div className="w-full bg-card border-b p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="/avatar.png" />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-4">
          <Textarea 
            placeholder="What is happening?!" 
            className="border-none shadow-none resize-none text-lg min-h-[60px] p-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex gap-1 text-primary">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                <Smile className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                <CalendarClock className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10">
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              disabled={!content.trim()} 
              className="rounded-full px-4 font-bold bg-primary hover:bg-primary/90 text-white"
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function XPostCard() {
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [likes, setLikes] = useState(420);
  const [retweets, setRetweets] = useState(68);

  const handleLike = () => {
    if (liked) {
      setLikes(l => l - 1);
    } else {
      setLikes(l => l + 1);
    }
    setLiked(!liked);
  };

  const handleRetweet = () => {
    if (retweeted) {
      setRetweets(r => r - 1);
    } else {
      setRetweets(r => r + 1);
    }
    setRetweeted(!retweeted);
  };

  return (
    <div className="w-full border-b hover:bg-muted/30 transition-colors p-4 cursor-pointer">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar className="h-10 w-10 ring-1 ring-border">
            <AvatarImage src="/avatar.png" alt="Profile" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[15px] leading-5 truncate">
              <span className="font-bold text-foreground hover:underline">Jane Doe</span>
              <span className="text-muted-foreground">@janedoe_tech</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-muted-foreground hover:underline">2h</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-blue-500/10 hover:text-blue-500 -mr-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Post Text */}
          <div className="mt-1 text-[15px] leading-normal whitespace-pre-wrap text-foreground">
            Just shipped the new dashboard UI! 🚀
            <br/><br/>
            It&apos;s amazing how much difference a little bit of whitespace and consistent typography makes. The glassmorphic touches really pop on dark mode.
            <br/><br/>
            What do you think? 👇
            <span className="text-primary block mt-2 hover:underline">#webdesign #uiux #buildinginpublic</span>
          </div>

          {/* Media/Image Placeholder */}
          <div className="mt-3 rounded-2xl border bg-muted/50 overflow-hidden aspect-video flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 opacity-50" />
            <div className="text-muted-foreground text-sm font-medium z-10 bg-background/80 backdrop-blur px-4 py-2 rounded-full border shadow-sm">
              Image Preview
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-3 -ml-2 max-w-md pr-12">
            <ActionButton 
              icon={MessageCircle} 
              count={12} 
              colorClass="hover:text-blue-500 group-hover:bg-blue-500/10" 
            />
            <ActionButton 
              icon={Repeat2} 
              count={retweets} 
              active={retweeted}
              colorClass="hover:text-green-500 group-hover:bg-green-500/10"
              activeClass="text-green-500"
              onClick={handleRetweet}
            />
            <ActionButton 
              icon={Heart} 
              count={likes} 
              active={liked}
              colorClass="hover:text-pink-500 group-hover:bg-pink-500/10" 
              activeClass="text-pink-500 fill-current"
              onClick={handleLike}
            />
            <ActionButton 
              icon={BarChart2} 
              count="1.2k" 
              colorClass="hover:text-blue-500 group-hover:bg-blue-500/10" 
            />
            <div className="flex">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground rounded-full hover:bg-blue-500/10 hover:text-blue-500">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ 
  icon: Icon, 
  count, 
  colorClass, 
  activeClass, 
  active, 
  onClick 
}: { 
  icon: any, 
  count: number | string, 
  colorClass: string,
  activeClass?: string,
  active?: boolean,
  onClick?: () => void
}) {
  return (
    <button 
      className={cn("group flex items-center gap-1.5 transition-colors outline-none", active && activeClass)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className={cn("p-2 rounded-full transition-colors text-muted-foreground group-hover:text-current", colorClass, active && activeClass, active && "bg-opacity-10")}>
        <Icon className={cn("h-[18px] w-[18px]", active && activeClass)} />
      </div>
      <span className={cn("text-xs font-medium text-muted-foreground transition-colors group-hover:text-current", colorClass, active && activeClass)}>
        {count}
      </span>
    </button>
  );
}