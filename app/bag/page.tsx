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

type ExternalDisc = {
  externalId: string;
  brand: string;
  mold: string;
  plastic: string | null;
  type: string | null;
  speed: number | null;
  glide: number | null;
  turn: number | null;
  fade: number | null;
  stability: string | null;
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
  const [localDiscs, setLocalDiscs] = useState<Disc[]>([]);
  const [bag, setBag] = useState<UserDisc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDiscId, setSelectedDiscId] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [wearLevel, setWearLevel] = useState('seasoned');

  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // api results
  const [externalResults, setExternalResults] = useState<ExternalDisc[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  // Track if user has actually run a search yet
  const [hasSearched, setHasSearched] = useState(false);

  const loadInitialDiscs = async () => {
    try {
      setSearchLoading(true);
      setError(null);

      const res = await fetch('/api/discs');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load disc catalog');
        return;
      }
      setLocalDiscs(data.discs || []);
    } catch (err) {
      console.error(err);
      setError('Unexpected error loading disc catalog');
    } finally {
      setSearchLoading(false);
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

  // search local discs adn then use rapidapi if no local matches
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    setHasSearched(true);

    // Reset previous results/errors
    setExternalResults([]);
    setExternalError(null);

    if (!q) {
      await loadInitialDiscs();
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);

      // local search
      const localRes = await fetch(
        `/api/discs?q=${encodeURIComponent(q)}`
      );
      const localData = await localRes.json();
      if (!localRes.ok) {
        setError(localData.error || 'Failed to search local catalog');
        return;
      }
      const local = (localData.discs || []) as Disc[];
      setLocalDiscs(local);

      // if  no matches, fall back to api
      if (local.length === 0) {
        setExternalLoading(true);
        const extRes = await fetch(
          `/api/discs/disc-search?q=${encodeURIComponent(q)}`
        );
        const extData = await extRes.json();
        if (!extRes.ok) {
          setExternalError(
            extData.error || 'Error searching external disc database'
          );
          setExternalResults([]);
          return;
        }
        setExternalResults((extData.discs || []) as ExternalDisc[]);
      }
    } catch (err) {
      console.error(err);
      setError('Unexpected error while searching discs');
    } finally {
      setSearchLoading(false);
      setExternalLoading(false);
    }
  };

  const handleClearSearch = async () => {
    setSearch('');
    setHasSearched(false);
    setExternalResults([]);
    setExternalError(null);
    setError(null);
    await loadInitialDiscs();
  };

  const handleAddExternalDiscToBag = async (disc: ExternalDisc) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/bag/add-from-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          disc,
          nickname: null,
          wearLevel: 'new',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add external disc to bag');
        return;
      }

      await loadBag();
    } catch (err) {
      console.error(err);
      setError('Unexpected error adding external disc to bag');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialDiscs();
    loadBag();
  }, []);

  const localCount = localDiscs.length;
  const externalCount = externalResults.length;

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
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-semibold">Add disc to bag</h2>

          {/* Search catalog controls */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-2 md:items-end"
          >
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[11px] text-slate-300">
                Search discs (brand or mold)
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Buzzz, Destroyer, Envy..."
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={searchLoading}
                className="rounded-md px-4 py-2 bg-slate-800 text-xs border border-slate-600 hover:bg-slate-700 disabled:opacity-50"
              >
                {searchLoading ? 'Searching…' : 'Search'}
              </button>
              {(hasSearched || search) && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="rounded-md px-3 py-2 bg-slate-900 text-xs border border-slate-700 hover:bg-slate-800"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          {/* status lines */}
          <div className="text-[11px] text-slate-400">
            {searchLoading || externalLoading
              ? 'Searching discs…'
              : !hasSearched && !search
              ? 'Type a disc name to search your discs.'
              : localCount > 0
              ? `Found ${localCount} matching disc${localCount === 1 ? '' : 's'}.`
              : externalCount > 0
              ? `Found ${externalCount} discs you can add to your bag.`
              : 'No discs found for that search.'}
          </div>

          {/* add to bag form */}
          {localCount > 0 && (
            <form
              onSubmit={handleAddToBag}
              className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
            >
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-[11px] text-slate-300">
                  Disc from your bag
                </label>
                <select
                  value={selectedDiscId}
                  onChange={(e) => setSelectedDiscId(e.target.value)}
                  className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">
                    Select a disc…
                  </option>
                  {localDiscs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.brand} {d.mold}{' '}
                      {d.plastic ? `(${d.plastic})` : ''} ·{' '}
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
          )}

          {/* api results list (when no local matches) */}
          {externalCount > 0 && localCount === 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-800 rounded-md p-2 bg-slate-950/40 mt-2">
              {externalResults.map((d) => (
                <div
                  key={d.externalId}
                  className="flex items-center justify-between gap-2 py-1 border-b border-slate-800 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-100">
                      {d.brand} {d.mold}{' '}
                      {d.plastic ? `(${d.plastic})` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {d.type || 'Unknown type'} · {d.speed ?? '?'}
                      /{d.glide ?? '?'} / {d.turn ?? '?'} / {d.fade ?? '?'} ·{' '}
                      {d.stability || 'Unknown stability'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddExternalDiscToBag(d)}
                    disabled={loading}
                    className="text-[11px] px-2 py-1 rounded-md border border-emerald-500 text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-50"
                  >
                    Add to bag
                  </button>
                </div>
              ))}
            </div>
          )}

          {externalError && (
            <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-600/50 rounded-md px-3 py-2 mt-2">
              {externalError}
            </div>
          )}
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
              No discs in your bag yet. Add something using the search above.
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
