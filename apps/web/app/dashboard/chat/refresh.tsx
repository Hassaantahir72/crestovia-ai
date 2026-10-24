"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TeamChatRefresh({ channelId }: { channelId: string }) {
  const router = useRouter();
  const subscribed = useRef(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    subscribed.current = false;
    setLive(false);

    const channel = supabase
      .channel("team-messages:" + channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_messages",
          filter: "channel_id=eq." + channelId,
        },
        () => {
          if (active) router.refresh();
        },
      )
      .subscribe((status) => {
        if (!active) return;
        const connected = status === "SUBSCRIBED";
        subscribed.current = connected;
        setLive(connected);
      });

    // Fallback refresh keeps chat usable if Realtime is temporarily unavailable.
    const fallback = window.setInterval(() => {
      if (active && !subscribed.current) router.refresh();
    }, 30000);

    return () => {
      active = false;
      subscribed.current = false;
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [channelId, router]);

  return (
    <span className="status" aria-live="polite">
      {live ? "Live updates" : "Connecting · fallback refresh enabled"}
    </span>
  );
}
