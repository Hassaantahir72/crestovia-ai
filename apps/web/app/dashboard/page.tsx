import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role,status,organizations(id,name,slug)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships?.length) redirect("/onboarding");

  return (
    <main className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <div><p className="brand">CRESTOVIA AI</p><h1 style={{ marginBottom: 4 }}>Workspace overview</h1><p className="muted">Your personal and company operating workspace</p></div>
        <SignOutButton />
      </header>
      <section className="grid">
        <article className="panel"><h2>Identity</h2><p className="muted">Signed in as</p><strong>{user.email}</strong><p className="muted" style={{ fontSize: 12, overflowWrap: "anywhere" }}>User ID: {user.id}</p></article>
        <article className="panel"><h2>Organizations</h2>{memberships?.length ? memberships.map((membership: any, i: number) => {
          const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
          return <p key={`${org?.id ?? "org"}-${i}`}><strong>{org?.name ?? "Organization"}</strong><br /><span className="muted">{membership.role}</span></p>;
        }) : <p className="muted">No active organization membership yet. The initial organization setup flow is the next foundation task.</p>}</article>
        <article className="panel"><h2>AI assistant</h2><p className="muted">Groq chat and permission-filtered company memory are planned for Phase 3.</p></article>
        <article className="panel"><h2>Company workspace</h2><p className="muted">Your organization-scoped project and task workspace.</p><div className="action-links"><a className="button" href="/dashboard/projects">Open projects</a><a className="button button-secondary" href="/dashboard/tasks">Open tasks</a></div></article>
      </section>
    </main>
  );
}
