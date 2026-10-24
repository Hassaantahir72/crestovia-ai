"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function TeamChatRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [router]);
  return <span className="status" aria-live="polite">Auto-refresh · 5 sec</span>;
}
