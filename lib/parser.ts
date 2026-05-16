import { ParsedListen, SupportedFormat } from "@/types/music";
import { splitSongAndArtist } from "@/lib/normalization";
import DOMPurify from "dompurify";

interface TakeoutJsonItem {
  title?: string;
  titleUrl?: string;
  subtitles?: Array<{ name?: string }>;
  header?: string;
  time?: string;
}

interface HtmlCandidateBlock {
  element: Element;
  text: string;
  links: string[];
  timeRaw: string | null;
  isYouTubeMusicBlock: boolean;
}

interface HtmlPageContext {
  fileLooksLikeTakeout: boolean;
  pageIndicatesMusicHistory: boolean;
}

const htmlMusicExtractionError =
  "We found a Takeout HTML file, but couldn’t extract music plays. Please make sure this is the YouTube and YouTube Music watch-history.html file.";

const monthPattern =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const takeoutDatePattern = new RegExp(
  `\\b${monthPattern}\\s+\\d{1,2},\\s+\\d{4},\\s+\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM)?(?:\\s+(?:UTC|GMT)?[+-]\\d{2}:?\\d{2}|\\s+(?:UTC|GMT|[A-Z]{2,5})|Z)?\\b`,
  "gi",
);
const isoDatePattern = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})\b/gi;
const ignoredLinkLabels = new Set([
  "youtube",
  "youtube music",
  "products",
  "product",
  "google",
  "my activity",
  "details",
  "learn more",
  "why is this here?",
]);
const timezoneOffsets: Record<string, string> = {
  UTC: "+0000",
  GMT: "+0000",
  BST: "+0100",
  CET: "+0100",
  CEST: "+0200",
  EET: "+0200",
  EEST: "+0300",
  EST: "-0500",
  EDT: "-0400",
  CST: "-0600",
  CDT: "-0500",
  MST: "-0700",
  MDT: "-0600",
  PST: "-0800",
  PDT: "-0700",
  AKST: "-0900",
  AKDT: "-0800",
  HST: "-1000",
  JST: "+0900",
  KST: "+0900",
  IST: "+0530",
  NZST: "+1200",
  NZDT: "+1300",
  AEST: "+1000",
  AEDT: "+1100",
  ACST: "+0930",
  ACDT: "+1030",
  AWST: "+0800",
};

const parseHtmlDocument = (value: string) =>
  new DOMParser().parseFromString(
    DOMPurify.sanitize(value, {
      USE_PROFILES: { html: true },
      WHOLE_DOCUMENT: true,
    }),
    "text/html",
  );

const normalizeText = (value?: string) =>
  (value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;|&#xa0;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u00c2(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeMultilineText = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;|&#xa0;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u00c2(?=\s|$)/g, "")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\r/g, "")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const stripTagsWithBreaks = (value: string) =>
  normalizeMultilineText(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|section|article|li|tr|td|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

const previewText = (value: string) => normalizeText(value).slice(0, 160);

const findTimestampCandidate = (value: string): string | null => {
  const normalized = normalizeText(value);
  const exactDate = normalized.match(takeoutDatePattern)?.[0];
  if (exactDate) return exactDate;
  return normalized.match(isoDatePattern)?.[0] ?? null;
};

const parseDate = (raw?: string): number | null => {
  if (!raw) return null;

  const normalized = normalizeText(raw);
  const direct = Date.parse(normalized);
  if (!Number.isNaN(direct)) return direct;

  const timezoneMatch = normalized.match(/\b([A-Z]{2,5})$/);
  if (timezoneMatch) {
    const offset = timezoneOffsets[timezoneMatch[1]];
    if (offset) {
      const replaced = normalized.replace(/\b([A-Z]{2,5})$/, offset);
      const parsed = Date.parse(replaced);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }

  const utcOffsetMatch = normalized.match(/\b(UTC|GMT)([+-]\d{1,2})(?::?(\d{2}))?$/i);
  if (utcOffsetMatch) {
    const [, , hours, minutes = "00"] = utcOffsetMatch;
    const sign = hours.startsWith("-") ? "-" : "+";
    const paddedHours = hours.replace(/^[+-]/, "").padStart(2, "0");
    const paddedMinutes = minutes.padStart(2, "0");
    const replaced = normalized.replace(
      /\b(UTC|GMT)([+-]\d{1,2})(?::?(\d{2}))?$/i,
      `${sign}${paddedHours}${paddedMinutes}`,
    );
    const parsed = Date.parse(replaced);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return null;
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

const getPageContext = (doc: Document): HtmlPageContext => {
  const pageText = normalizeText(doc.body?.textContent ?? "");
  const hasYoutube = /\byoutube\b/i.test(pageText);
  const hasYoutubeMusic = /\byoutube music\b/i.test(pageText);
  const hasHistory = /\b(?:watch[-\s]?history|history|my activity)\b/i.test(pageText);

  return {
    fileLooksLikeTakeout: hasYoutube && hasHistory,
    pageIndicatesMusicHistory: hasYoutube && hasYoutubeMusic && hasHistory,
  };
};

const isMeaningfulHistoryLink = (value: string) => {
  const normalized = normalizeText(value);
  if (!normalized) return false;
  if (ignoredLinkLabels.has(normalized.toLowerCase())) return false;
  return !/^products?:?/i.test(normalized);
};

const buildListen = (titleText: string, artistText: string | undefined, timeRaw: string): ParsedListen | null => {
  const playedAtMs = parseDate(timeRaw);
  if (!playedAtMs) return null;

  const { song, artist } = splitSongAndArtist(titleText, artistText);
  if (!song || song === "Unknown Song") return null;

  return {
    song,
    artist,
    timestamp: new Date(playedAtMs).toISOString(),
    playedAtMs,
    sourceTitle: titleText,
  };
};

const getCandidateBlocks = (doc: Document) => {
  const rawCandidates = Array.from(doc.body?.querySelectorAll("div, section, article, li, tr") ?? [])
    .map((element) => {
      const text = normalizeText(element.textContent ?? "");
      const links = Array.from(element.querySelectorAll("a"))
        .map((link) => normalizeText(link.textContent ?? ""))
        .filter(isMeaningfulHistoryLink);
      const timeRaw = findTimestampCandidate(text);
      const hasPlaybackMarker = /\b(?:watched|listened(?:\s+to)?)\b/i.test(text);
      const isYouTubeMusicBlock = /\byoutube music\b/i.test(text);
      const looksLikeCard = hasPlaybackMarker || isYouTubeMusicBlock || /-\s*topic\b/i.test(links.join(" "));

      return {
        element,
        text,
        links,
        timeRaw,
        isYouTubeMusicBlock,
        looksLikeCard,
      };
    })
    .filter(
      (candidate) =>
        candidate.looksLikeCard &&
        candidate.links.length >= 2 &&
        Boolean(candidate.timeRaw) &&
        candidate.text.length >= 20 &&
        candidate.text.length <= 3000,
    )
    .sort((left, right) => left.text.length - right.text.length);

  const deduped: HtmlCandidateBlock[] = [];

  for (const candidate of rawCandidates) {
    if (deduped.some((accepted) => candidate.element.contains(accepted.element))) continue;
    deduped.push(candidate);
  }

  return deduped;
};

const parseHtmlHistoryWithDom = async (
  doc: Document,
): Promise<{
  candidateBlocks: HtmlCandidateBlock[];
  listens: ParsedListen[];
  skippedPreviews: string[];
}> => {
  const { pageIndicatesMusicHistory } = getPageContext(doc);
  const candidateBlocks = getCandidateBlocks(doc);
  const listens: ParsedListen[] = [];
  const skippedPreviews: string[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < candidateBlocks.length; index += 1) {
    const candidate = candidateBlocks[index];
    const titleText = candidate.links[0];
    const artistText = candidate.links[1];
    const qualifies =
      candidate.isYouTubeMusicBlock || /-\s*topic\b/i.test(artistText ?? "") || pageIndicatesMusicHistory;

    if (!titleText || !candidate.timeRaw || !qualifies) {
      if (skippedPreviews.length < 3) skippedPreviews.push(previewText(candidate.text));
      continue;
    }

    const listen = buildListen(titleText, artistText, candidate.timeRaw);
    if (!listen) {
      if (skippedPreviews.length < 3) skippedPreviews.push(previewText(candidate.text));
      continue;
    }

    const key = `${listen.song}::${listen.artist}::${listen.playedAtMs}`;
    if (seen.has(key)) continue;
    seen.add(key);
    listens.push(listen);

    if (index % 500 === 0) {
      await Promise.resolve();
    }
  }

  return { candidateBlocks, listens, skippedPreviews };
};

const parseHtmlHistoryWithFallback = async (
  text: string,
  pageContext: HtmlPageContext,
): Promise<ParsedListen[]> => {
  const blockText = stripTagsWithBreaks(text);
  const blocks = blockText
    .split(/\n{2,}/)
    .map((value) => normalizeMultilineText(value))
    .filter(Boolean);
  const listens: ParsedListen[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const lines = block
      .split("\n")
      .map((line) => normalizeText(line))
      .filter(Boolean);

    if (lines.length < 3) continue;

    const timeRaw = lines.find((line) => Boolean(findTimestampCandidate(line)));
    if (!timeRaw) continue;

    const titleIndex = lines.findIndex((line) => /\b(?:watched|listened(?:\s+to)?)\b/i.test(line));
    if (titleIndex === -1) continue;

    const artistLine = lines
      .slice(titleIndex + 1)
      .find(
        (line) =>
          !findTimestampCandidate(line) &&
          !/\byoutube music\b/i.test(line) &&
          !/^products?:?/i.test(line) &&
          !/^why is this here\??$/i.test(line),
      );

    const qualifies =
      lines.some((line) => /\byoutube music\b/i.test(line)) ||
      /-\s*topic\b/i.test(artistLine ?? "") ||
      pageContext.pageIndicatesMusicHistory;
    if (!qualifies) continue;

    const listen = buildListen(lines[titleIndex], artistLine, findTimestampCandidate(timeRaw) ?? timeRaw);
    if (!listen) continue;

    const key = `${listen.song}::${listen.artist}::${listen.playedAtMs}`;
    if (seen.has(key)) continue;
    seen.add(key);
    listens.push(listen);

    if (index % 500 === 0) {
      await Promise.resolve();
    }
  }

  return listens;
};

const parseHtmlHistory = async (text: string): Promise<ParsedListen[]> => {
  let doc: Document | null = null;

  try {
    doc = parseHtmlDocument(text);
  } catch {
    doc = null;
  }

  const pageContext = doc ? getPageContext(doc) : { fileLooksLikeTakeout: false, pageIndicatesMusicHistory: false };

  if (!doc) {
    throw new Error(htmlMusicExtractionError);
  }

  const { candidateBlocks, listens, skippedPreviews } = await parseHtmlHistoryWithDom(doc);
  const fallbackListens = listens.length === 0 ? await parseHtmlHistoryWithFallback(text, pageContext) : [];
  const parsedListens = listens.length === 0 ? fallbackListens : listens;
  const youtubeMusicBlocks = candidateBlocks.filter((candidate) => candidate.isYouTubeMusicBlock).length;

  console.debug("[takeout-html-parser]", {
    candidateBlocks: candidateBlocks.length,
    youtubeMusicBlocks,
    parsedListens: parsedListens.length,
    skippedBlockPreviews: skippedPreviews.slice(0, 3),
  });

  if (parsedListens.length === 0) {
    throw new Error(htmlMusicExtractionError);
  }

  return parsedListens;
};

export const detectFormat = (fileName: string, text: string): SupportedFormat | null => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".json")) return "json";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";

  const sample = text.slice(0, 200).trim().toLowerCase();
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
