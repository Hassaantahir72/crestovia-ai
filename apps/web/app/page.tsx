import Link from "next/link";

const capabilities = [
  {
    number: "01",
    title: "Meet Jarvis, your AI partner",
    description: "Chat with your assistant, request a briefing, plan work, and turn ideas into approval-ready tasks without losing company context.",
    href: "/login",
    label: "Open assistant",
  },
  {
    number: "02",
    title: "One home for every department",
    description: "Manage teams, projects, tasks, and department ownership in one workspace, with role-aware access and clear responsibilities.",
    href: "/login",
    label: "Explore workspace",
  },
  {
    number: "03",
    title: "Voice, chat, and trusted actions",
    description: "Use chat today and add voice interaction where your browser supports it; consequential actions stay behind explicit human approval.",
    href: "/login",
    label: "Review the workflow",
  },
];

export default function HomePage() {
  return (
    <main className="container landing">
      <header className="landing-nav">
        <Link className="landing-wordmark" href="/" aria-label="Crestovia AI home">
          <span className="landing-mark" aria-hidden="true">C</span>
          <span>CRESTOVIA<span className="landing-wordmark-light"> AI</span></span>
        </Link>
        <div className="landing-nav-actions">
          <span className="landing-private"><span aria-hidden="true" /> Private workspace</span>
          <Link className="button button-secondary landing-signin" href="/login">Sign in <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow"><span /> THE OPERATING SYSTEM FOR YOUR COMPANY</p>
          <h1 id="landing-title">Less busywork.<br /><span>More forward.</span></h1>
          <p className="landing-intro">
            Meet Jarvis, your company’s AI partner and your personal assistant. Bring your people, projects, departments, and daily briefings together—with useful automation that keeps you in control.
          </p>
          <div className="landing-actions">
            <Link className="button landing-primary" href="/login">Enter your workspace <span aria-hidden="true">→</span></Link>
            <a className="landing-text-link" href="#capabilities">Explore capabilities <span aria-hidden="true">↓</span></a>
          </div>
          <div className="landing-trust">
            <span className="landing-trust-icon" aria-hidden="true">✓</span>
            <p><strong>Built around control.</strong> Private access, scoped work, and approval before consequential actions.</p>
          </div>
        </div>

        <div className="landing-visual" aria-label="Illustration of a company operations command center">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />
          <div className="landing-glow" />
          <div className="landing-console">
            <div className="landing-console-top">
              <div className="landing-console-brand"><span className="landing-mini-mark">C</span><span>CRESTOVIA <small>COMMAND</small></span></div>
              <span className="landing-console-live"><i /> SYSTEM CONCEPT</span>
            </div>
            <div className="landing-console-body">
              <p className="landing-console-label">YOUR COMPANY, IN SYNC</p>
              <h2>Good morning.<br /><span>Let’s move things forward.</span></h2>
              <div className="landing-console-stats">
                <div><span>WORKSPACE</span><strong>Connected</strong><small><i /> Ready for setup</small></div>
                <div><span>AI ASSISTANT</span><strong>On your side</strong><small>Human-approved actions</small></div>
              </div>
              <div className="landing-console-task">
                <span className="landing-task-check">✓</span>
                <div><strong>One place for the work</strong><small>Briefings · Departments · Tasks · Projects</small></div>
                <span className="landing-task-arrow">↗</span>
              </div>
            </div>
          </div>
          <div className="landing-float landing-float-top"><span className="landing-float-icon">✳</span><span><strong>Jarvis, with context</strong><small>Company work and private planning</small></span></div>
          <div className="landing-float landing-float-bottom"><span className="landing-float-icon landing-float-icon-green">✓</span><span><strong>You stay in control</strong><small>Review before action</small></span></div>
        </div>
      </section>

      <section className="landing-capabilities" id="capabilities" aria-labelledby="capabilities-title">
        <div className="landing-section-heading">
          <div><p className="landing-eyebrow">ONE CONNECTED WORKSPACE</p><h2 id="capabilities-title">The moving parts. <span>Working together.</span></h2></div>
          <p>Designed to make everyday operations clearer, more connected, and easier to manage.</p>
        </div>
        <div className="landing-capability-grid">
          {capabilities.map((capability) => (
            <article className="landing-capability-card" key={capability.number}>
              <span className="landing-card-number">{capability.number}</span>
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
              <Link href={capability.href}>{capability.label} <span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <Link className="landing-wordmark landing-footer-brand" href="/"><span className="landing-mark" aria-hidden="true">C</span><span>CRESTOVIA<span className="landing-wordmark-light"> AI</span></span></Link>
        <p>Clarity for the work. Control over the automation.</p>
        <span>Private preview · Built for deliberate growth</span>
      </footer>
    </main>
  );
}
