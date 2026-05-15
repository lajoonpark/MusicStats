import {
  HeatmapPoint,
  MonthlyStat,
  MusicSummary,
  ParsedListen,
  RankedItem,
  RankedSong,
  RepeatSong,
  Streaks,
} from "@/types/music";
import { buildSongKey } from "@/lib/normalization";

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

const sortByPlays = <T extends { plays: number }>(items: T[]) =>
  items.sort((a, b) => b.plays - a.plays);

export function getTopArtists(listens: ParsedListen[], limit = 10): RankedItem[] {
  const map = new Map<string, number>();
  for (const listen of listens) {
    map.set(listen.artist, (map.get(listen.artist) ?? 0) + 1);
  }

  return sortByPlays(
    Array.from(map.entries()).map(([name, plays]) => ({ name, plays })),
  ).slice(0, limit);
}

export function getTopSongs(listens: ParsedListen[], limit = 10): RankedSong[] {
  const map = new Map<string, RankedSong>();

  for (const listen of listens) {
    const key = buildSongKey(listen.song, listen.artist);
    const current = map.get(key);
    if (current) {
      current.plays += 1;
      continue;
    }

    map.set(key, {
      key,
      name: listen.song,
      artist: listen.artist,
      plays: 1,
    });
  }

  return sortByPlays(Array.from(map.values())).slice(0, limit);
}

const slidingWindowBursts = (timestamps: number[], windowMs: number): number => {
  let left = 0;
  let bursts = 0;

  for (let right = 0; right < timestamps.length; right += 1) {
    while (timestamps[right] - timestamps[left] > windowMs) {
      left += 1;
    }

    const count = right - left + 1;
    if (count >= 3) bursts += 1;
  }

  return bursts;
};

export function getRepeatSongs(listens: ParsedListen[], limit = 10): RepeatSong[] {
  const grouped = new Map<string, { song: string; artist: string; times: number[] }>();

  for (const listen of listens) {
    const key = buildSongKey(listen.song, listen.artist);
    const current = grouped.get(key);
    if (current) {
      current.times.push(listen.playedAtMs);
      continue;
    }

    grouped.set(key, {
      song: listen.song,
      artist: listen.artist,
      times: [listen.playedAtMs],
    });
  }

  const repeats: RepeatSong[] = [];

  for (const [key, value] of grouped.entries()) {
    if (value.times.length < 3) continue;

    const sorted = value.times.sort((a, b) => a - b);
    const days = new Map<string, number>();

    for (const ts of sorted) {
      const dayKey = new Date(ts).toISOString().slice(0, 10);
      days.set(dayKey, (days.get(dayKey) ?? 0) + 1);
    }

    const maxDailyRepeats = Math.max(...Array.from(days.values()));
    const oneHourBursts = slidingWindowBursts(sorted, 1000 * 60 * 60);

    const obsessionLevel =
      value.times.length + Math.max(0, maxDailyRepeats - 2) * 2 + oneHourBursts * 3;

    if (maxDailyRepeats < 5 && oneHourBursts === 0) continue;

    repeats.push({
      key,
      song: value.song,
      artist: value.artist,
      plays: value.times.length,
      maxDailyRepeats,
      oneHourBursts,
      obsessionLevel,
    });
  }

  return repeats.sort((a, b) => b.obsessionLevel - a.obsessionLevel).slice(0, limit);
}

export function getListeningHeatmap(listens: ParsedListen[]): HeatmapPoint[] {
  const map = new Map<string, HeatmapPoint>();

  for (const listen of listens) {
    const date = new Date(listen.playedAtMs);
    const day = dayFormatter.format(date);
    const hour = date.getHours();
    const key = `${day}-${hour}`;

    const current = map.get(key);
    if (current) {
      current.plays += 1;
      continue;
    }

    map.set(key, { day, hour, plays: 1 });
  }

  return Array.from(map.values());
}

export function getMonthlyStats(listens: ParsedListen[]): MonthlyStat[] {
  const map = new Map<string, number>();

  for (const listen of listens) {
    const date = new Date(listen.playedAtMs);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, plays]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        month: monthFormatter.format(new Date(year, month - 1, 1)),
        plays,
      };
    });
}

export function getListeningStreaks(listens: ParsedListen[]): Streaks {
  const uniqueDays = Array.from(
    new Set(listens.map((listen) => new Date(listen.playedAtMs).toISOString().slice(0, 10))),
  ).sort();

  if (uniqueDays.length === 0) {
    return { longestStreakDays: 0, currentStreakDays: 0 };
  }

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = Date.parse(uniqueDays[i - 1]);
    const next = Date.parse(uniqueDays[i]);
    const diffDays = (next - prev) / (24 * 60 * 60 * 1000);

    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  const daySet = new Set(uniqueDays);
  const today = new Date().toISOString().slice(0, 10);
  let currentStreakDays = 0;
  let cursor = Date.parse(today);

  while (daySet.has(new Date(cursor).toISOString().slice(0, 10))) {
    currentStreakDays += 1;
    cursor -= 24 * 60 * 60 * 1000;
  }

  return { longestStreakDays: longest, currentStreakDays };
}

export function buildMusicSummary(listens: ParsedListen[]): MusicSummary {
  const topArtists = getTopArtists(listens);
  const topSongs = getTopSongs(listens);
  const repeatSongs = getRepeatSongs(listens);
  const monthlyStats = getMonthlyStats(listens);
  const heatmap = getListeningHeatmap(listens);
  const streaks = getListeningStreaks(listens);

  const byHour = new Map<number, number>();
  const byDay = new Map<string, number>();

  for (const listen of listens) {
    const date = new Date(listen.playedAtMs);
    const hour = date.getHours();
    const day = dayFormatter.format(date);
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const favoriteHour =
    sortByPlays(Array.from(byHour.entries()).map(([name, plays]) => ({ name, plays })))[0]?.name ?? 0;

  const artistDistribution = sortByPlays(
    Array.from(
      listens.reduce((acc, listen) => {
        acc.set(listen.artist, (acc.get(listen.artist) ?? 0) + 1);
        return acc;
      }, new Map<string, number>()),
    ).map(([name, plays]) => ({ name, plays })),
  ).slice(0, 6);

  const mostActiveDays = sortByPlays(
    Array.from(byDay.entries()).map(([name, plays]) => ({ name, plays })),
  );

  const uniqueSongKeys = new Set(listens.map((listen) => buildSongKey(listen.song, listen.artist)));
  const uniqueArtistKeys = new Set(listens.map((listen) => listen.artist.toLowerCase()));

  return {
    totalPlays: listens.length,
    uniqueSongs: uniqueSongKeys.size,
    uniqueArtists: uniqueArtistKeys.size,
    favoriteHour,
    topArtist: topArtists[0],
    topSong: topSongs[0],
    topArtists,
    topSongs,
    repeatSongs,
    monthlyStats,
    artistDistribution,
    mostActiveDays,
    heatmap,
    recentlyPlayed: [...listens].sort((a, b) => b.playedAtMs - a.playedAtMs).slice(0, 10),
    streaks,
  };
}
