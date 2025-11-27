'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      setLoadingUser(true);
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (error) {
        console.error('Navbar auth.getUser error:', error);
      }
      if (!cancelled) {
        setUser(data?.user ?? null);
        setLoadingUser(false);
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabaseBrowser.auth.signOut();
      if (error) {
        console.error('Navbar signOut error:', error);
      }
      setUser(null);
    } finally {
      setSigningOut(false);
    }
  };

  const emailLabel =
    user?.email && user.email.length > 24
      ? user.email.slice(0, 21) + '…'
      : user?.email ?? '';

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* Left: brand + main links */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-slate-50"
          >
            Disc Caddy
          </Link>
          <Link
            href="/bag"
            className="hidden sm:inline-block text-[11px] text-slate-300 hover:text-emerald-300"
          >
            Bag
          </Link>
        </div>

        {/*auth state */}
        <div className="flex items-center gap-2">
          {loadingUser ? (
            <span className="text-[11px] text-slate-500">
              Checking account…
            </span>
          ) : user ? (
            <>
              {emailLabel && (
                <span className="hidden sm:inline text-[11px] text-slate-400">
                  {emailLabel}
                </span>
              )}
              <Link
                href="/auth"
                className="text-[11px] px-2 py-1 rounded border border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Account
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-[11px] px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-900/40 disabled:opacity-50"
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-[11px] px-3 py-1 rounded bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
