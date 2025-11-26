'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      setLoadingUser(true);
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (error) {
        console.error('Error loading user', error);
      }
      setUser(data?.user ?? null);
      setLoadingUser(false);
    };

    loadUser();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabaseBrowser.auth.signUp({
          email,
          password,
        });
        if (error) {
          setError(error.message || 'Sign up failed');
          return;
        }
        setMessage('Account created. You can now sign in.');
        setMode('signin');
      } else {
        const { data, error } = await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(error.message || 'Sign in failed');
          return;
        }
        setUser(data.user ?? null);
        setMessage('Signed in successfully.');
        // Optional: jump straight to bag
        window.location.href = '/bag';
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error during auth');
    } finally {
      setSubmitting(false);
    }
  };

  // google sign-in handler
  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/bag`,
        },
      });
      if (error) {
        setError(error.message || 'Google sign-in failed');
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error during Google sign-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) {
        setError(error.message || 'Sign out failed');
        return;
      }
      setUser(null);
      setMessage('Signed out.');
    } catch (err) {
      console.error(err);
      setError('Unexpected error signing out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Account</h1>
          <Link
            href="/"
            className="text-xs px-3 py-1 rounded border border-slate-700 hover:bg-slate-800"
          >
            ⬅ Back home
          </Link>
        </header>

        {loadingUser ? (
          <p className="text-sm text-slate-400">Checking sign-in…</p>
        ) : user ? (
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold">You&apos;re signed in</h2>
            <p className="text-xs text-slate-300 wrap-break-word">
              Email:{' '}
              <span className="font-mono">
                {user.email ?? '(no email on record)'}
              </span>
            </p>
            <div className="flex gap-2 mt-2">
              <Link
                href="/bag"
                className="text-xs px-3 py-2 rounded-md bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
              >
                Go to your bag
              </Link>
              <button
                onClick={handleSignOut}
                disabled={submitting}
                className="text-xs px-3 py-2 rounded-md border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
            {message && (
              <p className="text-[11px] text-emerald-300 mt-2">{message}</p>
            )}
            {error && (
              <p className="text-[11px] text-red-400 mt-1">{error}</p>
            )}
          </section>
        ) : (
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {mode === 'signin' ? 'Sign in' : 'Create an account'}
              </h2>
              <button
                type="button"
                onClick={() =>
                  setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
                }
                className="text-[11px] underline text-slate-400 hover:text-slate-200"
              >
                {mode === 'signin'
                  ? 'Need an account? Sign up'
                  : 'Already have an account? Sign in'}
              </button>
            </div>

            {/* google sign-in button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 bg-slate-100 text-slate-900 text-xs font-semibold hover:bg-white disabled:opacity-50"
            >
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                or continue with email
              </span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting
                  ? mode === 'signin'
                    ? 'Signing in…'
                    : 'Creating account…'
                  : mode === 'signin'
                  ? 'Sign in'
                  : 'Sign up'}
              </button>
            </form>

            {message && (
              <p className="text-[11px] text-emerald-300 mt-1">{message}</p>
            )}
            {error && (
              <p className="text-[11px] text-red-400 mt-1">{error}</p>
            )}

            <p className="text-[11px] text-slate-500 mt-2">
              Once signed in, you can build your bag and log rounds tied to
              your account.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
