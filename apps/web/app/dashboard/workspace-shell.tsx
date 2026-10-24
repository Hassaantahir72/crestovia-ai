"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: "WORKSPACE", items: [
    { href: "/dashboard", label: "Overview", icon: "◫", exact: true },
    { href: "/dashboard/assistant", label: "Crestovia AI", icon: "✦", accent: true },
    { href: "/dashboard/tasks", label: "Tasks", icon: "☷" },
    { href: "/dashboard/projects", label: "Projects", icon: "▦" },
    { href: "/dashboard/chat", label: "Team chat", icon: "◌" },
  ]},
  { label: "COMPANY", items: [
    { href: "/dashboard/team", label: "People & access", icon: "♧" },
    { href: "/dashboard/departments", label: "Departments", icon: "⌘" },
    { href: "/dashboard/briefing", label: "Daily briefing", icon: "◷" },
  ]},
  { label: "SYSTEM", items: [
    { href: "/dashboard/integrations/whatsapp", label: "Integrations", icon: "⤳" },
    { href: "/dashboard/memory", label: "AI memory", icon: "◇" },
    { href: "/dashboard/approvals", label: "Approvals", icon: "✓" },
    { href: "/dashboard/security", label: "Security", icon: "⬡" },
    { href: "/dashboard/audit", label: "Audit log", icon: "≋" },
  ]},
];

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="workspace-shell">
    <aside className="workspace-sidebar" aria-label="Main navigation">
      <Link href="/dashboard" className="workspace-brand"><span className="workspace-brand-mark">C</span><span className="workspace-brand-copy"><strong>Crestovia</strong><small>AI WORKSPACE</small></span></Link>
      <Link href="/dashboard/assistant" className="sidebar-ai-card"><span className="sidebar-ai-orb">✦</span><span><strong>Meet your AI</strong><small>Your work companion</small></span><span className="sidebar-ai-arrow">↗</span></Link>
      <nav className="sidebar-nav">
        {groups.map((group) => <section className="sidebar-group" key={group.label}><p>{group.label}</p>{group.items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
          return <Link key={item.href} href={item.href} className={"sidebar-link" + (active ? " is-active" : "") + (item.accent ? " sidebar-link-ai" : "")} aria-current={active ? "page" : undefined}><span className="sidebar-link-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.accent ? <span className="sidebar-new-dot" /> : null}</Link>;
        })}</section>)}
      </nav>
      <div className="sidebar-footer"><span className="sidebar-status-dot"/><span><strong>Workspace ready</strong><small>Private company space</small></span></div>
    </aside>
    <div className="workspace-main"><div className="workspace-mobile-brand"><Link href="/dashboard" className="workspace-brand"><span className="workspace-brand-mark">C</span><span className="workspace-brand-copy"><strong>Crestovia</strong><small>AI WORKSPACE</small></span></Link><Link href="/dashboard/assistant" className="mobile-ai-link">✦ Ask AI</Link></div><div className="workspace-mobile-nav" aria-label="Quick navigation">{groups[0].items.map(item => <Link key={item.href} href={item.href} className={(item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/")) ? "is-active" : ""}>{item.label}</Link>)}</div><div className="workspace-content">{children}</div></div>
  </div>;
}
