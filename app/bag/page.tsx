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
  // optional weight field 
  weight_grams?: number | null;
};

export default function BagPage() {
  const [localDiscs, setLocalDiscs] = useState<Disc[]>([]);
  // last 5 created in discs table
  const [recentCatalogDiscs, setRecentCatalogDiscs] = useState<Disc[]>([]);

  const [bag, setBag] = useState<UserDisc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDiscId, setSelectedDiscId] = useState<string>('');
  const [selectedExternalDisc, setSelectedExternalDisc] =
    useState<ExternalDisc | null>(null);

  const [nickname, setNickname] = useState('');
  const [wearLevel, setWearLevel] = useState('');
  const [weight, setWeight] = useState('');

  // Search state
  const [search, setSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [externalResults, setExternalResults] = useState<ExternalDisc[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

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

  // load last 5 discs from discs table 
  const loadRecentDiscs = async () => {
    try {
      const res = await fetch('/api/discs?recent=1');
      const data = await res.json();
      if (!res.ok) {
        console.error(data.error || 'Failed to load recent discs');
        return;
      }
      setRecentCatalogDiscs(data.discs || []);
    } catch (err) {
      console.error('Unexpected error loading recent discs', err);
    }
  };

  // if no local matches, search API
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    setHasSearched(true);

    setExternalResults([]);
    setExternalError(null);
    setSelectedDiscId('');
    setSelectedExternalDisc(null);

    if (!q) {
      setLocalDiscs([]);
      setExternalResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);

      // Local search
      const localRes = await fetch(
        `/api/discs?q=${encodeURIComponent(q)}`
      );
      const localData = await localRes.json();
      if (!localRes.ok) {
        setError(localData.error || 'Failed to search disc catalog');
        return;
      }
      const local = (localData.discs || []) as Disc[];
      setLocalDiscs(local);

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
    setSelectedDiscId('');
    setSelectedExternalDisc(null);
    setLocalDiscs([]);
    // Could call loadRecentDiscs() here if we want to refresh "recent"
  };

  // Single "Add to bag" handler that works for either a local or external disc
  const handleAddSelectedDisc = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasLocal = !!selectedDiscId;
    const hasExternal = !!selectedExternalDisc;

    if (!hasLocal && !hasExternal) {
      return; // nothing selected
    }

    // Convert weight string to number or null
    const weightGrams =
      weight.trim() === '' ? null : Number(weight.trim());

    try {
      setLoading(true);
      setError(null);

      if (hasLocal) {
        // Local disc in our catalog: POST /api/bag
        const res = await fetch('/api/bag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: DEMO_USER_ID,
            discId: selectedDiscId,
            nickname: nickname.trim() || null,
            wearLevel: wearLevel || null,
            weight_grams: Number.isNaN(weightGrams) ? null : weightGrams,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to add disc to bag');
          return;
        }
      } else if (hasExternal && selectedExternalDisc) {
        // External disc: POST /api/bag/add-from-search
        const res = await fetch('/api/bag/add-from-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: DEMO_USER_ID,
            disc: selectedExternalDisc,
            nickname: nickname.trim() || null,
            wearLevel: wearLevel || null,
            weight_grams: Number.isNaN(weightGrams) ? null : weightGrams,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to add external disc to bag');
          return;
        }
      }

      // Reset and reload bag
      setNickname('');
      setWearLevel('');
      setWeight('');
      setSelectedDiscId('');
      setSelectedExternalDisc(null);
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
    loadBag();
    loadRecentDiscs();
  }, []);

  const localCount = localDiscs.length;
  const externalCount = externalResults.length;

  const selectedLocalDisc = selectedDiscId
    ? localDiscs.find((d) => d.id === selectedDiscId) ?? null
    : null;

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

          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-2 md:items-end"
          >
            <div className="flex-1 flex flex-col gap-1 relative">
              <label className="text-[11px] text-slate-300">
                Search discs (brand or mold)
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="e.g. Buzzz, Destroyer, Envy..."
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* recent discs dropdown */}
              {searchFocused &&
                !hasSearched &&
                !search &&
                recentCatalogDiscs.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-slate-800 bg-slate-950/95 shadow-lg">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-slate-400">
                      Recent discs
                    </div>
                    <div className="max-h-52 overflow-y-auto text-xs">
                      {recentCatalogDiscs.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onMouseDown={(e) => {
                            // prevent blur from firing before click
                            e.preventDefault();
                            setSelectedDiscId(d.id);
                            setSelectedExternalDisc(null);
                            setSearch(`${d.brand} ${d.mold}`);
                            setHasSearched(false);
                            setLocalDiscs([d]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 border-t border-slate-800 first:border-t-0"
                        >
                          <div className="text-slate-100">
                            {d.brand} {d.mold}{' '}
                            {d.plastic ? `(${d.plastic})` : ''}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {d.type || 'Unknown type'} · {d.speed} /{' '}
                            {d.glide ?? '?'} / {d.turn ?? '?'} / {d.fade ?? '?'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
              ? 'Type a disc name to search.'
              : localCount > 0
              ? `Found ${localCount} matching disc${localCount === 1 ? '' : 's'}.`
              : externalCount > 0
              ? `Found ${externalCount} discs you can add to your bag.`
              : 'No discs found for that search.'}
          </div>

          {localCount > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-800 rounded-md p-2 bg-slate-950/40 mt-2">
              {localDiscs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-2 py-1 border-b border-slate-800 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-100">
                      {d.brand} {d.mold}{' '}
                      {d.plastic ? `(${d.plastic})` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {d.type || 'Unknown type'} · {d.speed}
                      /{d.glide ?? '?'} / {d.turn ?? '?'} / {d.fade ?? '?'} ·{' '}
                      {d.stability || 'Unknown stability'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDiscId(d.id);
                      setSelectedExternalDisc(null);
                    }}
                    className={`text-[11px] px-2 py-1 rounded-md border ${
                      selectedDiscId === d.id
                        ? 'border-emerald-400 text-emerald-200 bg-emerald-900/40'
                        : 'border-slate-600 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {selectedDiscId === d.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* api results list */}
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
                    type="button"
                    onClick={() => {
                      setSelectedExternalDisc(d);
                      setSelectedDiscId('');
                    }}
                    className={`text-[11px] px-2 py-1 rounded-md border ${
                      selectedExternalDisc?.externalId === d.externalId
                        ? 'border-emerald-400 text-emerald-200 bg-emerald-900/40'
                        : 'border-slate-600 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {selectedExternalDisc?.externalId === d.externalId
                      ? 'Selected'
                      : 'Select'}
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

          <form
            onSubmit={handleAddSelectedDisc}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mt-2"
          >
            <div className="md:col-span-4 text-[11px] text-slate-300">
              {selectedLocalDisc && (
                <span>
                  Selected disc:{' '}
                  <span className="font-semibold">
                    {selectedLocalDisc.brand} {selectedLocalDisc.mold}
                  </span>
                </span>
              )}
              {selectedExternalDisc && (
                <span>
                  Selected disc:{' '}
                  <span className="font-semibold">
                    {selectedExternalDisc.brand} {selectedExternalDisc.mold}
                  </span>
                </span>
              )}
              {!selectedLocalDisc && !selectedExternalDisc && (
                <span>
                  Select a disc above, then optionally add nickname, wear
                  level, and weight.
                </span>
              )}
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
                Wear level (optional)
              </label>
              <select
                value={wearLevel}
                onChange={(e) => setWearLevel(e.target.value)}
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Not set</option>
                <option value="new">New</option>
                <option value="seasoned">Seasoned</option>
                <option value="beat">Beat</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-slate-300">
                Weight in Grams (optional)
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 173"
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                (!selectedLocalDisc && !selectedExternalDisc)
              }
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
