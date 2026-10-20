import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrganizationForm } from "./organization-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (memberships?.length) redirect("/dashboard");

  return (
    <main className="container">
      <div className="panel" style={{ maxWidth: 560, margin: "7vh auto" }}>
        <p className="brand">CRESTOVIA AI</p>
        <h1>Create your company workspace</h1>
        <p className="muted">The account creating the first workspace becomes its owner. Invite flows will be added after the initial foundation.</p>
        <OrganizationForm />
      </div>
    </main>
  );
}
