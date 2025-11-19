'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const DEMO_USER_ID = '1deb1304-f95e-4951-bfc1-7fbbb5b83204';

type Disc = {
  id: string;
  brand: string;
  mold: string;
  plastic: string | null;
  type: string | null;
  speed: number;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
  created_at: string;
};

type UserDisc = {
  id: string; 
  user_id: string;
  disc_id: string;
  nickname: string | null;
  wear_level: string | null;
  in_bag: boolean;
  created_at: string;
  disc: Disc;
};

export default function BagPage() {
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [bag, setBag] = useState<UserDisc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDiscId, setSelectedDiscId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [wearLevel, setWearLevel] = useState('seasoned');

  const loadDiscs = async () => {
    try {
      const res = await fetch('/api/discs');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load disc catalog');
        return;
      }
      setDiscs(data.discs || []);
    } catch (err) {
      console.error(err);
      setError('Unexpected error loading disc catalog');
    }
  };

  const loadBag = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/bag?userId=${DEMO_USER_ID}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load bag');
        return;
      }
      setBag(data.bag || []);
    } catch (err) {
      console.error(err);
      setError('Unexpected error loading bag');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/bag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          discId: selectedDiscId,
          nickname: nickname.trim() || null,
          wearLevel: wearLevel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add disc to bag');
        return;
      }

      // Reset form and reload bag
      setSelectedDiscId('');
      setNickname('');
      setWearLevel('seasoned');
      await loadBag();
    } catch (err) {
      console.error(err);
      setError('Unexpected error adding disc to bag');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromBag = async (userDiscId: string) => {
    if (!userDiscId) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/bag', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userDiscId,
          userId: DEMO_USER_ID,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to remove disc from bag');
        return;
      }
      await loadBag();
    } catch (err) {
      console.error(err);
      setError('Unexpected error removing disc from bag');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load both catalog + bag on page load
    loadDiscs();
    loadBag();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              Your Disc Bag
            </h1>
            <p className="text-xs text-slate-400">
              Manage the discs you carry. We&apos;ll later use this for AI
              recommendations.
            </p>
          </div>
          <Link
            href="/"
            className="text-xs px-3 py-1 rounded border border-slate-700 hover:bg-slate-800"
          >
            ⬅ Back to rounds
          </Link>
        </header>

        {error && (
          <div className="text-xs text-red-400 bg-red-950/40 border border-red-600/50 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Add disc to bag */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold">Add disc to bag</h2>
          <form
            onSubmit={handleAddToBag}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          >
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-[11px] text-slate-300">
                Disc from catalog
              </label>
              <select
                value={selectedDiscId}
                onChange={(e) => setSelectedDiscId(e.target.value)}
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a disc…</option>
                {discs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.brand} {d.mold} {d.plastic ? `(${d.plastic})` : ''} ·{' '}
                    {d.type || '?'} · {d.speed}/{d.glide ?? '-'} /
                    {d.turn ?? '-'} / {d.fade ?? '-'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-300">
                Nickname (optional)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Flippy Buzzz"
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-300">
                Wear level
              </label>
              <select
                value={wearLevel}
                onChange={(e) => setWearLevel(e.target.value)}
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="new">New</option>
                <option value="seasoned">Seasoned</option>
                <option value="beat">Beat</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedDiscId}
              className="md:col-span-4 md:justify-self-start rounded-md px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to bag
            </button>
          </form>
        </section>

        {/* Current bag */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Discs in bag</h2>
            <button
              onClick={loadBag}
              disabled={loading}
              className="text-[11px] px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading && bag.length === 0 && (
            <p className="text-sm text-slate-400">Loading bag...</p>
          )}

          {!loading && bag.length === 0 && (
            <p className="text-sm text-slate-500">
              No discs in your bag yet. Add something from the catalog above.
            </p>
          )}

          {bag.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left py-2 pr-3">Disc</th>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-left py-2 pr-3">Numbers</th>
                    <th className="text-left py-2 pr-3">Nickname</th>
                    <th className="text-left py-2 pr-3">Wear</th>
                    <th className="text-right py-2 pl-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bag.map((ud) => (
                    <tr
                      key={ud.id}
                      className="border-b border-slate-800 last:border-b-0"
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-100">
                          {ud.disc.brand} {ud.disc.mold}{' '}
                          {ud.disc.plastic ? `(${ud.disc.plastic})` : ''}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-slate-300">
                        {ud.disc.type || '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-300">
                        {ud.disc.speed}/{ud.disc.glide ?? '-'} /
                        {ud.disc.turn ?? '-'} / {ud.disc.fade ?? '-'}
                      </td>
                      <td className="py-2 pr-3 text-slate-200">
                        {ud.nickname || '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-200">
                        {ud.wear_level || '—'}
                      </td>
                      <td className="py-2 pl-3 text-right">
                        <button
                          onClick={() => handleRemoveFromBag(ud.id)}
                          className="px-2 py-1 rounded border border-red-600 text-red-300 hover:bg-red-900/40 text-[11px]"
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
