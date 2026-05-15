"use client";

import { ArtistDistributionChart } from "@/components/charts/ArtistDistributionChart";
import { ListeningActivityChart } from "@/components/charts/ListeningActivityChart";
import { TopArtistsChart } from "@/components/charts/TopArtistsChart";
import { TopSongsChart } from "@/components/charts/TopSongsChart";
import { RecapCard } from "@/components/cards/RecapCard";
import { StatCard } from "@/components/cards/StatCard";
import { getMusicPersonality } from "@/lib/personality";
import { MusicSummary } from "@/types/music";

interface Props {
  summary: MusicSummary;
}

export function Dashboard({ summary }: Props) {
  const personality = getMusicPersonality(summary);

  return (
    <div className="fade-in space-y-6 pb-10">
      <header className="glass-card p-6">
        <h2 className="text-2xl font-semibold text-zinc-100">Your Listening Dashboard</h2>
        <p className="mt-2 text-zinc-300">{personality.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {personality.labels.map((label) => (
            <span key={label} className="rounded-full border border-zinc-600/80 bg-zinc-800/80 px-3 py-1 text-xs text-zinc-100">
              {label}
            </span>
          ))}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Plays" value={summary.totalPlays} icon="▶️" />
        <StatCard label="Unique Songs" value={summary.uniqueSongs} icon="🎵" />
        <StatCard label="Unique Artists" value={summary.uniqueArtists} icon="🎤" />
        <StatCard label="Longest Streak (days)" value={summary.streaks.longestStreakDays} icon="🔥" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Top 10 Artists</h3>
          <TopArtistsChart data={summary.topArtists} />
        </div>
        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Top 10 Songs</h3>
          <TopSongsChart data={summary.topSongs} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Listening Activity by Month</h3>
          <ListeningActivityChart data={summary.monthlyStats} />
        </div>
        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Artist Distribution</h3>
          <ArtistDistributionChart data={summary.artistDistribution} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Songs On Repeat</h3>
          {summary.repeatSongs.length === 0 ? (
            <p className="text-zinc-400">No heavy repeat patterns were detected yet.</p>
          ) : (
            <ul className="space-y-3">
              {summary.repeatSongs.map((song) => (
                <li key={song.key} className="rounded-xl border border-zinc-700/70 bg-zinc-900/40 p-3">
                  <p className="font-medium text-zinc-100">{song.song}</p>
                  <p className="text-sm text-zinc-400">{song.artist}</p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {song.plays} plays · Daily max {song.maxDailyRepeats} · Bursts {song.oneHourBursts} · Obsession {song.obsessionLevel}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Recently Played</h3>
          <ul className="space-y-2">
            {summary.recentlyPlayed.map((listen) => (
              <li key={`${listen.song}-${listen.artist}-${listen.playedAtMs}`} className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-3">
                <p className="font-medium text-zinc-100">{listen.song}</p>
                <p className="text-sm text-zinc-400">{listen.artist}</p>
                <p className="text-xs text-zinc-500">{new Date(listen.playedAtMs).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-4 text-xl font-semibold">Most Active Listening Days</h3>
          <ul className="space-y-2">
            {summary.mostActiveDays.map((day) => (
              <li key={day.name} className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-900/30 px-3 py-2">
                <span>{day.name}</span>
                <span className="text-zinc-300">{day.plays}</span>
              </li>
            ))}
          </ul>
        </div>

        <RecapCard summary={summary} personality={personality} />
      </section>
    </div>
  );
}
