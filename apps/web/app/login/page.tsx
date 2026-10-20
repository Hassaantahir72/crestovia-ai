import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="container">
      <div className="panel" style={{ maxWidth: 460, margin: "7vh auto" }}>
        <p className="brand">CRESTOVIA AI</p>
        <h1>Sign in</h1>
        <p className="muted">Use your invited company account to access the workspace.</p>
        <LoginForm />
      </div>
    </main>
  );
}
