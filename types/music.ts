export type SupportedFormat = "json" | "html";

export interface ParsedListen {
  song: string;
  artist: string;
  timestamp: string;
  playedAtMs: number;
  sourceTitle: string;
}

export interface RankedItem {
  name: string;
  plays: number;
}

export interface RankedSong extends RankedItem {
  artist: string;
  key: string;
}

export interface RepeatSong {
  key: string;
  song: string;
  artist: string;
  plays: number;
  maxDailyRepeats: number;
  oneHourBursts: number;
  obsessionLevel: number;
}

export interface MonthlyStat {
  month: string;
  plays: number;
}

export interface HeatmapPoint {
  day: string;
  hour: number;
  plays: number;
}

export interface Streaks {
  longestStreakDays: number;
  currentStreakDays: number;
}

export interface MusicSummary {
  totalPlays: number;
  uniqueSongs: number;
  uniqueArtists: number;
  favoriteHour: number;
  topArtist?: RankedItem;
  topSong?: RankedSong;
  topArtists: RankedItem[];
  topSongs: RankedSong[];
  repeatSongs: RepeatSong[];
  monthlyStats: MonthlyStat[];
  artistDistribution: RankedItem[];
  mostActiveDays: RankedItem[];
  heatmap: HeatmapPoint[];
  recentlyPlayed: ParsedListen[];
  streaks: Streaks;
}

export interface PersonalityResult {
  labels: string[];
  summary: string;
}
