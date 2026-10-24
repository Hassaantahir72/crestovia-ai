"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeamChatRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(id);
  }, [router]);
  return <span className="status" aria-live="polite">Auto-refresh · 5 sec</span>;
}
