import { useState, type FormEvent } from 'react';

export type SignIn = (credentials: { email: string; password: string }) => Promise<void>;

export function Login({ onSignIn }: { onSignIn: SignIn }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      await onSignIn({ email: String(fields.get('email') || ''), password: String(fields.get('password') || '') });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed.');
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page">
    <aside className="auth-story">
      <img src="/assets/ocd-brilliance-logo.png" alt="OCD Brilliance" />
      <div>
        <span className="eyebrow">A little support. A brighter everyday.</span>
        <h2>Care starts with a clear next step.</h2>
        <p>Tell us what you need. Our office will review your request and help arrange the right support.</p>
        <a className="btn" href="#/public/intake">Request support <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></a>
      </div>
      <p className="auth-story-note">Intake · Review · Arrange support</p>
    </aside>
    <section className="auth-card">
      <img src="/assets/ocd-brilliance-logo.png" alt="OCD Brilliance" />
      <span className="eyebrow">Operations platform</span>
      <h1>Office sign in</h1>
      <p>Your care operations workspace.</p>
      <form id="staff-login" onSubmit={submit} aria-busy={pending}>
        <label>Email or username<input name="email" type="text" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <p className="field-error" role="alert" hidden={!error}>{error}</p>
        <button className="btn primary" type="submit" disabled={pending}>Sign in</button>
      </form>
      <a href="#/public/intake">Open public intake</a>
    </section>
  </main>;
}
