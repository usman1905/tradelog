import { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', withSampleData: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const isNew = mode === 'register';
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (isNew) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth__card" onSubmit={submit}>
        <div className="logo"><span className="logo__mark" aria-hidden="true" />TradeLog</div>
        <h1>{isNew ? 'Create your account' : 'Sign in'}</h1>
        <p className="muted">{isNew ? 'Start tracking every trade in a minute.' : 'Welcome back. Pick up where you left off.'}</p>
        {isNew && <label>Name<input value={form.name} onChange={set('name')} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} autoComplete={isNew ? 'new-password' : 'current-password'} minLength={isNew ? 8 : undefined} required /></label>
        {isNew && (
          <label className="check"><input type="checkbox" checked={form.withSampleData} onChange={set('withSampleData')} />Start with sample trades</label>
        )}
        <p className="error" role="alert">{error}</p>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Please wait…' : isNew ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="link" onClick={() => { setMode(isNew ? 'login' : 'register'); setError(''); }}>
          {isNew ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </main>
  );
}
