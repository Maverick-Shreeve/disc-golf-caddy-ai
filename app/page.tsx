'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Fake user id from Supabase just for local testing.
const DEMO_USER_ID = '1deb1304-f95e-4951-bfc1-7fbbb5b83204';

type Round = {
  id: string;
  user_id: string;
  course_name: string;
  layout_name?: string | null;
  date_played?: string;
  start_time?: string;
  end_time?: string;
  source: string;
  created_at: string;
};

export default function HomePage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // UDisc import state
  const [udiscFile, setUdiscFile] = useState<File | null>(null);
  const [udiscPlayerName, setUdiscPlayerName] = useState('');
  const [udiscLoading, setUdiscLoading] = useState(false);
  const [udiscMessage, setUdiscMessage] = useState<string | null>(null);

  const loadRounds = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/rounds?userId=${DEMO_USER_ID}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load rounds');
        return;
      }
      setRounds(data.rounds || []);
    } catch (err) {
      console.error(err);
      setError('Unexpected error loading rounds');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          courseName: courseName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create round');
        return;
      }
      setCourseName('');
      await loadRounds();
    } catch (err) {
      console.error(err);
      setError('Unexpected error creating round');
    } finally {
      setLoading(false);
    }
  };

  const handleUdiscFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null;
    setUdiscFile(file);
    setUdiscMessage(null);
  };

  const handleImportUdisc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!udiscFile) {
      setUdiscMessage('Please choose a UDisc CSV file first.');
      return;
    }

    try {
      setUdiscLoading(true);
      setUdiscMessage(null);
      setError(null);

      const formData = new FormData();
      formData.append('file', udiscFile);
      formData.append('userId', DEMO_USER_ID);
      if (udiscPlayerName.trim()) {
        formData.append('playerName', udiscPlayerName.trim());
      }

      const res = await fetch('/api/import/udisc', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUdiscMessage(data.error || 'Failed to import UDisc round');
        return;
      }

      setUdiscMessage(
        `Imported round for ${data.playerName || 'player'} (${data.holesInserted} holes).`
      );
      setUdiscFile(null);
      setUdiscPlayerName('');
      // clear the <input type="file"> visually:
      const fileInput = document.getElementById(
        'udiscFileInput'
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';

      await loadRounds();
    } catch (err) {
      console.error(err);
      setUdiscMessage('Unexpected error importing UDisc CSV');
    } finally {
      setUdiscLoading(false);
    }
  };

  useEffect(() => {
    loadRounds();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-xl px-4 py-8 space-y-8">
        <header className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Disc Golf Caddy AI
          </h1>
          <p className="text-slate-300 text-sm">
            Log rounds manually or import from UDisc. Later, we&apos;ll use
            this data to power personalized AI caddy recommendations.
          </p>
        </header>

        {/* Manual round create */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Add Round Manually</h2>
          <form
            onSubmit={handleAddRound}
            className="flex flex-col sm:flex-row gap-3 mb-2"
          >
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Course name (e.g. Milo McIver)"
              className="flex-1 rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !courseName.trim()}
              className="rounded-md px-4 py-2 bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Round
            </button>
          </form>
          {error && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-600/50 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </section>

        {/* UDisc import */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold">Import UDisc Round</h2>
          <p className="text-xs text-slate-400">
            Export a round from UDisc as CSV, then upload it here. Optionally,
            specify which player row to import.
          </p>
          <form onSubmit={handleImportUdisc} className="space-y-3">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="udiscFileInput"
                className="text-xs text-slate-200"
              >
                UDisc CSV file
              </label>
              <input
                id="udiscFileInput"
                type="file"
                accept=".csv,text/csv"
                onChange={handleUdiscFileChange}
                className="text-xs text-slate-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-200">
                Player name (optional)
              </label>
              <input
                type="text"
                value={udiscPlayerName}
                onChange={(e) => setUdiscPlayerName(e.target.value)}
                placeholder="Exact player name as in CSV (leave blank for first non-Par row)"
                className="rounded-md px-3 py-2 bg-slate-950 border border-slate-700 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {udiscMessage && (
              <div className="text-xs text-slate-300 bg-slate-800/70 border border-slate-700 rounded-md px-3 py-2">
                {udiscMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={udiscLoading || !udiscFile}
              className="rounded-md px-4 py-2 bg-indigo-500 text-slate-50 text-xs font-semibold hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {udiscLoading ? 'Importing...' : 'Import UDisc Round'}
            </button>
          </form>
        </section>

        {/* Rounds list */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-slate-100">
              Recent Rounds
            </h2>
            <button
              onClick={loadRounds}
              disabled={loading}
              className="text-xs px-2 py-1 rounded border border-slate-600 hover:bg-slate-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          {loading && rounds.length === 0 && (
            <p className="text-sm text-slate-400">Loading rounds...</p>
          )}
          {!loading && rounds.length === 0 && (
            <p className="text-sm text-slate-500">
              No rounds yet. Add one manually or import from UDisc.
            </p>
          )}
          <ul className="space-y-2">
            {rounds.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between text-sm border-b border-slate-800 last:border-b-0 pb-2"
              >
                <Link
                  href={`/rounds/${r.id}`}
                  className="flex-1 flex flex-col"
                >
                  <span className="font-medium text-slate-100">
                    {r.course_name}
                    {r.layout_name ? ` – ${r.layout_name}` : ''}
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.source === 'udisc' ? 'Imported from UDisc' : 'Manual'} ·{' '}
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
