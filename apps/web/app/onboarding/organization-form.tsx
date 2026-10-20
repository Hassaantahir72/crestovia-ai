"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function OrganizationForm() {
  const [name, setName] = useState("Crestovia");
  const [slug, setSlug] = useState("crestovia");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("create_organization", {
        p_name: name.trim(),
        p_slug: slugify(slug),
      });
      if (rpcError) throw rpcError;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create organization.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="organization-name">Company name</label>
      <input className="input" id="organization-name" required minLength={2} maxLength={120} value={name} onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)); }} />
      <label htmlFor="organization-slug">Workspace URL identifier</label>
      <input className="input" id="organization-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={slug} onChange={e => setSlug(slugify(e.target.value))} />
      <p className="muted" style={{ fontSize: 12 }}>Allowed: lowercase letters, numbers, and hyphens. The identifier must be unique.</p>
      {error && <p role="alert" style={{ color: "#ff9292" }}>{error}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? "Creating workspace…" : "Create workspace"}</button>
    </form>
  );
}
