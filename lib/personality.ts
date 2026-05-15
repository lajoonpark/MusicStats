import { MusicSummary, PersonalityResult } from "@/types/music";

const hourInRange = (hour: number, start: number, end: number) => {
  if (start <= end) return hour >= start && hour <= end;
  return hour >= start || hour <= end;
};

export function getMusicPersonality(summary: MusicSummary): PersonalityResult {
  const labels: string[] = [];
  const total = summary.totalPlays || 1;

  const nightPlays = summary.heatmap
    .filter((point) => hourInRange(point.hour, 22, 5))
    .reduce((acc, point) => acc + point.plays, 0);

  if (nightPlays / total >= 0.35) {
    labels.push("Late Night Listener");
  }

  const repeatPlays = summary.repeatSongs.reduce((acc, song) => acc + song.plays, 0);
  if (repeatPlays / total >= 0.25) {
    labels.push("Repeat Addict");
  }

  if (summary.uniqueArtists / Math.max(summary.uniqueSongs, 1) >= 0.6) {
    labels.push("Indie Explorer");
  }

  const weekendPlays = summary.mostActiveDays
    .filter((day) => day.name === "Sat" || day.name === "Sun")
    .reduce((acc, day) => acc + day.plays, 0);

  if (weekendPlays / total >= 0.4) {
    labels.push("Weekend Listener");
  }

  if (summary.totalPlays >= 500 && labels.length < 2) {
    labels.push("Playlist Grinder");
  }

  if (labels.length === 0) {
    labels.push("Balanced Listener");
  }

  return {
    labels,
    summary: `You're a ${labels[0]} with ${summary.totalPlays.toLocaleString()} plays and your hottest hour is ${summary.favoriteHour}:00.`,
  };
}
