"use client";

import { useMemo, useState } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { UploadZone } from "@/components/upload/UploadZone";
import { buildMusicSummary } from "@/lib/analytics";
import { parseTakeoutFile } from "@/lib/parser";
import { ParsedListen } from "@/types/music";

export default function Home() {
  const [listens, setListens] = useState<ParsedListen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const summary = useMemo(() => {
    if (listens.length === 0) return null;
    return buildMusicSummary(listens);
  }, [listens]);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const parsed = await parseTakeoutFile(file);
      setListens(parsed);
    } catch (err) {
      setListens([]);
      setError(err instanceof Error ? err.message : "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-8 text-zinc-100 sm:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <UploadZone onFileSelected={handleUpload} loading={loading} />

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-live="polite" aria-busy="true">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-rose-200">{error}</div>
        ) : null}

        {!loading && !summary && !error ? (
          <section className="glass-card p-8 text-center">
            <h2 className="text-2xl font-semibold">Ready for your Wrapped-style recap?</h2>
            <p className="mt-2 text-zinc-300">
              Upload your real Google Takeout file to see top artists, songs on repeat, monthly trends, and your music personality.
            </p>
          </section>
        ) : null}

        {summary ? <Dashboard summary={summary} /> : null}
      </div>
    </main>
  );
}
