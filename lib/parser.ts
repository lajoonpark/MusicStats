import { ParsedListen, SupportedFormat } from "@/types/music";
import { splitSongAndArtist } from "@/lib/normalization";

interface TakeoutJsonItem {
  title?: string;
  titleUrl?: string;
  subtitles?: Array<{ name?: string }>;
  header?: string;
  time?: string;
}

const parseDate = (raw?: string): number | null => {
  if (!raw) return null;
  const value = Date.parse(raw);
  return Number.isNaN(value) ? null : value;
};

const isMusicEvent = (item: TakeoutJsonItem) => {
  const source = `${item.header ?? ""} ${item.title ?? ""}`.toLowerCase();
  return source.includes("youtube") || source.includes("music");
};

const parseJsonHistory = async (text: string): Promise<ParsedListen[]> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Could not parse JSON. Please upload a valid Google Takeout JSON file.");
  }

  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "items" in parsed
      ? (parsed as { items: unknown[] }).items
      : [];

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("The JSON file is empty or in an unsupported format.");
  }

  const result: ParsedListen[] = [];
  const chunkSize = 2000;

  for (let i = 0; i < records.length; i += 1) {
    const item = records[i] as TakeoutJsonItem;
    if (!isMusicEvent(item) || !item.title) continue;

    const playedAtMs = parseDate(item.time);
    if (!playedAtMs) continue;

    const artistFromSubtitle = item.subtitles?.[0]?.name;
    const { song, artist } = splitSongAndArtist(item.title, artistFromSubtitle);

    result.push({
      song,
      artist,
      timestamp: new Date(playedAtMs).toISOString(),
      playedAtMs,
      sourceTitle: item.title,
    });

    if (i % chunkSize === 0) {
      await Promise.resolve();
    }
  }

  if (result.length === 0) {
    throw new Error("No playable YouTube Music history was found in this JSON file.");
  }

  return result;
};

const parseHtmlHistory = async (text: string): Promise<ParsedListen[]> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");
  const blocks = Array.from(doc.querySelectorAll("div.content-cell, div.outer-cell"));

  if (blocks.length === 0) {
    throw new Error("Unsupported HTML structure. Please export from Google Takeout history.");
  }

  const listens: ParsedListen[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const links = block.querySelectorAll("a");
    const titleText = links[0]?.textContent?.trim();
    const artistText = links[1]?.textContent?.trim();
    const timeRaw = block.textContent?.match(/\b\w+\s\d{1,2},\s\d{4}.*/)?.[0]?.trim();

    const playedAtMs = parseDate(timeRaw);
    if (!titleText || !playedAtMs) continue;

    const { song, artist } = splitSongAndArtist(titleText, artistText);

    listens.push({
      song,
      artist,
      timestamp: new Date(playedAtMs).toISOString(),
      playedAtMs,
      sourceTitle: titleText,
    });

    if (i % 2000 === 0) {
      await Promise.resolve();
    }
  }

  if (listens.length === 0) {
    throw new Error("No playable YouTube Music history was found in this HTML file.");
  }

  return listens;
};

export const detectFormat = (fileName: string, text: string): SupportedFormat | null => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".json")) return "json";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";

  const sample = text.slice(0, 200).trim();
  if (sample.startsWith("[") || sample.startsWith("{")) return "json";
  if (sample.startsWith("<!doctype html") || sample.startsWith("<html")) return "html";
  return null;
};

export async function parseTakeoutFile(file: File): Promise<ParsedListen[]> {
  const text = await file.text();
  if (!text.trim()) {
    throw new Error("Uploaded file is empty.");
  }

  const format = detectFormat(file.name, text);
  if (!format) {
    throw new Error("Unsupported file format. Please upload a JSON or HTML Takeout history file.");
  }

  return format === "json" ? parseJsonHistory(text) : parseHtmlHistory(text);
}
