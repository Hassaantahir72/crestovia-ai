import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <div className="panel" style={{ maxWidth: 820, margin: "10vh auto" }}>
        <p className="brand">CRESTOVIA AI</p>
        <h1 style={{ fontSize: "clamp(2.3rem, 6vw, 4.2rem)", lineHeight: 1.05, marginBottom: 16 }}>
          One assistant. One company workspace.
        </h1>
        <p className="muted" style={{ fontSize: 18, lineHeight: 1.7 }}>
          Your personal executive assistant and your company operating system—built around secure access,
          shared work, persistent knowledge, and approved automation.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link className="button" href="/login">Owner sign in</Link>
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>Live preview foundation · Company features and AI capabilities will be activated in stages.</p>
      </div>
    </main>
  );
}
