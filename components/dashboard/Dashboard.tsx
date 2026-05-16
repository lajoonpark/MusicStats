"use client";

import { useMemo, useState } from "react";
import { ArtistDistributionChart } from "@/components/charts/ArtistDistributionChart";
import { ListeningActivityChart } from "@/components/charts/ListeningActivityChart";
import { TopArtistsChart } from "@/components/charts/TopArtistsChart";
import { TopSongsChart } from "@/components/charts/TopSongsChart";
import { ChartCard } from "@/components/cards/ChartCard";
import { RecapCard } from "@/components/cards/RecapCard";
import { StatCard } from "@/components/cards/StatCard";
import { getMusicPersonality } from "@/lib/personality";
import {
  filterPlaysByTimeRange,
  formatDateRange,
  getTimeRangeBounds,
  TIME_RANGE_OPTIONS,
  TimeRangeKey,
} from "@/lib/timeRange";
import { buildMusicSummary } from "@/lib/analytics";
import { ParsedListen } from "@/types/music";

interface Props {
  listens: ParsedListen[];
}

export function Dashboard({ listens }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("all_time");

  const filteredPlays = useMemo(
    () => filterPlaysByTimeRange(listens, timeRange, new Date()),
    [listens, timeRange],
  );

  const summary = useMemo(
    () => (filteredPlays.length > 0 ? buildMusicSummary(filteredPlays) : null),
    [filteredPlays],
  );

  const personality = summary ? getMusicPersonality(summary) : null;

  const activeRange = useMemo(() => {
    const { start, end } = getTimeRangeBounds(timeRange, new Date());
    const earliestPlay = listens.reduce((min, play) => Math.min(min, play.playedAtMs), Number.POSITIVE_INFINITY);
    const latestPlay = listens.reduce((max, play) => Math.max(max, play.playedAtMs), Number.NEGATIVE_INFINITY);

    const rangeStart = start ?? new Date(earliestPlay);
    const rangeEnd = timeRange === "all_time" ? new Date(latestPlay) : end;
    return `Showing ${formatDateRange(rangeStart, rangeEnd)}`;
  }, [listens, timeRange]);

  const handleTimeRangeChange = (value: string) => {
    if (TIME_RANGE_OPTIONS.some((option) => option.key === value)) {
      setTimeRange(value as TimeRangeKey);
    }
  };

  return (
    <div className="fade-in space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="glass-card space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">Your Listening Dashboard</h2>
          {personality ? <p className="mt-2 text-zinc-300">{personality.summary}</p> : null}
          {personality ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {personality.labels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-zinc-600/80 bg-zinc-800/80 px-3 py-1 text-xs text-zinc-100"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="time-range" className="text-sm font-medium text-zinc-200">
            Time range
          </label>

          <div className="sm:hidden">
            <select
              id="time-range"
              value={timeRange}
              onChange={(event) => handleTimeRangeChange(event.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            >
              {TIME_RANGE_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {TIME_RANGE_OPTIONS.map((option) => {
              const selected = option.key === timeRange;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setTimeRange(option.key)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
                    selected
                      ? "border-sky-400/80 bg-sky-500/20 text-sky-100"
                      : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-zinc-400">{activeRange}</p>
        </div>
      </header>

      {!summary ? (
        <section className="glass-card p-6 text-center text-zinc-300">
          No listening history found for this time range.
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Plays" value={summary.totalPlays} icon="▶️" />
            <StatCard label="Unique Songs" value={summary.uniqueSongs} icon="🎵" />
            <StatCard label="Unique Artists" value={summary.uniqueArtists} icon="🎤" />
            <StatCard label="Longest Streak (days)" value={summary.streaks.longestStreakDays} icon="🔥" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Top 10 Artists">
              <TopArtistsChart data={summary.topArtists} />
            </ChartCard>
            <ChartCard title="Top 10 Songs">
              <TopSongsChart data={summary.topSongs} />
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Listening Activity by Month">
              <ListeningActivityChart data={summary.monthlyStats} />
            </ChartCard>
            <ChartCard title="Artist Distribution">
              <ArtistDistributionChart data={summary.artistDistribution} />
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Songs On Repeat">
              {summary.repeatSongs.length === 0 ? (
                <p className="text-zinc-400">No heavy repeat patterns were detected yet.</p>
              ) : (
                <ul className="space-y-3">
                  {summary.repeatSongs.map((song) => (
                    <li key={song.key} className="rounded-xl border border-zinc-700/70 bg-zinc-900/40 p-3">
                      <p className="truncate font-medium text-zinc-100">{song.song}</p>
                      <p className="truncate text-sm text-zinc-400">{song.artist}</p>
                      <p className="mt-1 text-sm text-zinc-300">
                        {song.plays} plays, daily max {song.maxDailyRepeats}, bursts {song.oneHourBursts}, obsession {song.obsessionLevel}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>

            <ChartCard title="Recently Played">
              <ul className="space-y-2">
                {summary.recentlyPlayed.map((listen) => (
                  <li
                    key={`${listen.song}-${listen.artist}-${listen.playedAtMs}`}
                    className="rounded-xl border border-zinc-700/60 bg-zinc-900/30 p-3"
                  >
                    <p className="truncate font-medium text-zinc-100">{listen.song}</p>
                    <p className="truncate text-sm text-zinc-400">{listen.artist}</p>
                    <p className="whitespace-nowrap text-xs text-zinc-500">{new Date(listen.playedAtMs).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Most Active Listening Days">
              <ul className="space-y-2">
                {summary.mostActiveDays.map((day) => (
                  <li
                    key={day.name}
                    className="flex items-center justify-between rounded-lg border border-zinc-700/60 bg-zinc-900/30 px-3 py-2"
                  >
                    <span className="truncate">{day.name}</span>
                    <span className="text-zinc-300">{day.plays}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>

            <RecapCard summary={summary} personality={personality!} />
          </section>
        </>
      )}
    </div>
  );
}
