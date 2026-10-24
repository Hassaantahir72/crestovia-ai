"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AssistantLauncher() {
  const pathname = usePathname();
  if (pathname === "/dashboard/assistant") return null;
  return (
    <Link className="assistant-global-launcher" href="/dashboard/assistant" aria-label="Open Crestovai AI assistant">
      <span className="assistant-launcher-orb" aria-hidden="true"><span /></span>
      <span className="assistant-launcher-copy"><strong>Ask Crestovai</strong><small>AI assistant</small></span>
      <span className="assistant-launcher-arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
