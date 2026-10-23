"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password.length < 12) {
      setError("Choose a password with at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can now sign in.");
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The password could not be updated. Request a fresh reset link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <section className="panel" style={{ maxWidth: 460, margin: "7vh auto" }}>
        <p className="brand">CRESTOVIA AI</p>
        <h1>Set a new password</h1>
        <p className="muted">Use the password-reset link sent to your verified email. Choose at least 12 characters.</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="new-password">New password</label>
          <input className="input" id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input className="input" id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          {error ? <p role="alert" style={{ color: "#ff9292" }}>{error}</p> : null}
          {message ? <p role="status">{message}</p> : null}
          <button className="button" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
          <a className="button button-secondary" href="/login">Return to sign in</a>
        </form>
      </section>
    </main>
  );
}
