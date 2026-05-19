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
  text: string;
  links: string[];
  timeRaw: string | null;
  isYouTubeMusicCard: boolean;
  isGeneralYouTubeCard: boolean;
}

const htmlParseError =
  "We found a Takeout HTML file, but couldn’t parse it. Please make sure this is the YouTube and YouTube Music watch-history.html file.";
const noMusicHistoryError =
  "No YouTube Music history was found. Make sure your Google Takeout export includes YouTube and YouTube Music → history, and that the file contains YouTube Music activity.";

const monthPattern =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const takeoutDatePattern = new RegExp(
  `\\b${monthPattern}\\s+\\d{1,2},\\s+\\d{4},\\s+\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM)?(?:\\s+(?:UTC|GMT)?[+-]\\d{2}:?\\d{2}|\\s+(?:UTC|GMT|[A-Z]{2,5})|Z)?\\b`,
  "gi",
);
// Matches day-first dates: "16 May 2026, 22:30:08 NZST" or "16 May 2026, 22:30 NZST"
const takeoutDatePatternDMY = new RegExp(
  `\\b\\d{1,2}\\s+${monthPattern}\\s+\\d{4},\\s+\\d{1,2}:\\d{2}(?::\\d{2})?\\s*(?:AM|PM)?(?:\\s+(?:UTC|GMT)?[+-]\\d{2}:?\\d{2}|\\s+(?:UTC|GMT|[A-Z]{2,5})|Z)?\\b`,
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
  "here",
]);
const YOUTUBE_MUSIC_PATTERN = /\bYouTube Music\b/;
const YOUTUBE_PATTERN = /\bYouTube\b/i;
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
    .replace(/\ufffd+/g, "")
    .replace(/[\u0080-\u009f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeMultilineText = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;|&#xa0;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u00c2(?=\s|$)/g, "")
    .replace(/\ufffd+/g, "")
    .replace(/[\u0080-\u009f]/g, "")
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

const normalizeCardText = (value: string) => normalizeMultilineText(value);

const cleanTitlePrefix = (value: string): string =>
  normalizeMojibakeText(value).replace(/^(?:Watched(?:\u00c2)?\s+|Listened to\s+)/i, "").trim();

// Normalizes common mojibake artifacts from mis-encoded Google Takeout exports.
// Handles cases where "Watched" is followed by a stray Â (U+00C2) from latin-1/UTF-8 mismatch.
// Apply this to decoded text content (not raw HTML) to clean encoding artifacts.
export const normalizeMojibakeText = (text: string): string =>
  text
    .replace(/Watched\u00c2\s*/gi, "Watched ")
    .replace(/\u00c2\u00a0/g, " ")
    .replace(/\u00c2(?=\s|$)/g, "")
    .replace(/\ufffd+/g, "")
    .replace(/[\u0080-\u009f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Converts day-first date strings to month-first for reliable Date.parse compatibility.
// "16 May 2026, 22:30:08 NZST" → "May 16, 2026, 22:30:08 NZST"
const normalizeDateToMDY = (value: string): string =>
  value.replace(
    new RegExp(`^(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4}),`, "i"),
    "$2 $1, $3,",
  );

const findTimestampCandidate = (value: string): string | null => {
  const normalized = normalizeText(value);
  const exactDate = normalized.match(takeoutDatePattern)?.[0];
  if (exactDate) return exactDate;
  const dmyDate = normalized.match(takeoutDatePatternDMY)?.[0];
  if (dmyDate) return dmyDate;
  return normalized.match(isoDatePattern)?.[0] ?? null;
};

const parseDate = (raw?: string): number | null => {
  if (!raw) return null;

  // Normalize day-first formats ("16 May 2026, ...") to month-first for Date.parse
  const normalized = normalizeDateToMDY(normalizeText(raw));
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

const isMusicEvent = (item: TakeoutJsonItem) =>
  YOUTUBE_MUSIC_PATTERN.test(item.header ?? "");

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
  let youtubeMusicCards = 0;
  let skippedGeneralYouTubeCards = 0;

  for (let i = 0; i < records.length; i += 1) {
    const item = records[i] as TakeoutJsonItem;
    if (!item.title) continue;

    if (!isMusicEvent(item)) {
      skippedGeneralYouTubeCards += 1;
      continue;
    }

    youtubeMusicCards += 1;

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

  console.debug("[takeout-json-parser]", {
    totalCards: records.length,
    youtubeMusicCards,
    parsedYouTubeMusicPlays: result.length,
    skippedGeneralYouTubeCards,
  });

  if (result.length === 0) {
    throw new Error(noMusicHistoryError);
  }

  return result;
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

  const cleanedTitle = cleanTitlePrefix(titleText);
  const { song, artist } = splitSongAndArtist(cleanedTitle, artistText);
  // Allow play if artist is known, even when the title is mojibake or missing
  const hasKnownArtist = artist !== "Unknown Artist";
  if (!song || (song === "Unknown Song" && !hasKnownArtist)) return null;

  return {
    song,
    artist,
    timestamp: new Date(playedAtMs).toISOString(),
    playedAtMs,
    sourceTitle: cleanedTitle,
  };
};

const getCardElements = (doc: Document): Element[] => {
  const selectors = [".outer-cell", ".content-cell", 'div[class*="content-cell"]', 'div[class*="outer-cell"]'];
  const elements = selectors.flatMap((selector) => Array.from(doc.querySelectorAll(selector)));
  const unique = Array.from(new Set(elements));
  return unique.sort((left, right) => {
    if (left === right) return 0;
    const pos = left.compareDocumentPosition(right);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
};

const extractMeaningfulAnchorTexts = (element: Element): string[] =>
  Array.from(element.querySelectorAll("a"))
    .map((link) => normalizeText(link.textContent ?? ""))
    .filter(isMeaningfulHistoryLink);

const buildDomCardCandidates = (
  doc: Document,
): { cards: HtmlCandidateBlock[]; totalCards: number } => {
  const elements = getCardElements(doc);
  const cards = elements.map((element) => {
    const text = normalizeCardText(element.textContent ?? "");
    const links = extractMeaningfulAnchorTexts(element);
    const timeRaw = findTimestampCandidate(text);
    const isYouTubeMusicCard = YOUTUBE_MUSIC_PATTERN.test(text);
    const isGeneralYouTubeCard = !isYouTubeMusicCard && YOUTUBE_PATTERN.test(text);

    return {
      text,
      links,
      timeRaw,
      isYouTubeMusicCard,
      isGeneralYouTubeCard,
    };
  });

  return { cards, totalCards: cards.length };
};

const iterateCandidateBlocks = async (
  candidateBlocks: HtmlCandidateBlock[],
): Promise<{ listens: ParsedListen[]; failedYouTubeMusicCardPreviews: string[]; skippedGeneralYouTubeCards: number }> => {
  const listens: ParsedListen[] = [];
  const failedYouTubeMusicCardPreviews: string[] = [];
  let skippedGeneralYouTubeCards = 0;
  const seen = new Set<string>();

  for (let index = 0; index < candidateBlocks.length; index += 1) {
    const candidate = candidateBlocks[index];
    if (candidate.isGeneralYouTubeCard) {
      skippedGeneralYouTubeCards += 1;
      continue;
    }
    if (!candidate.isYouTubeMusicCard) continue;

    const titleText = candidate.links[0];
    const artistText = candidate.links[1];

    if (!titleText || !artistText || !candidate.timeRaw) {
      if (failedYouTubeMusicCardPreviews.length < 3) {
        failedYouTubeMusicCardPreviews.push(previewText(candidate.text));
      }
      continue;
    }

    const listen = buildListen(titleText, artistText, candidate.timeRaw);
    if (!listen) {
      if (failedYouTubeMusicCardPreviews.length < 3) {
        failedYouTubeMusicCardPreviews.push(previewText(candidate.text));
      }
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

  return { listens, failedYouTubeMusicCardPreviews, skippedGeneralYouTubeCards };
};

const parseHtmlHistoryWithDom = async (
  doc: Document,
): Promise<{
  cards: HtmlCandidateBlock[];
  totalCards: number;
  youtubeMusicCards: number;
  listens: ParsedListen[];
  skippedGeneralYouTubeCards: number;
  failedYouTubeMusicCardPreviews: string[];
}> => {
  const { cards, totalCards } = buildDomCardCandidates(doc);
  const youtubeMusicCards = cards.filter((card) => card.isYouTubeMusicCard).length;
  const result = await iterateCandidateBlocks(cards);
  return { cards, totalCards, youtubeMusicCards, ...result };
};

const parseHtmlHistoryWithFallback = async (
  text: string,
): Promise<{ listens: ParsedListen[]; failedYouTubeMusicCardPreviews: string[] }> => {
  const failedYouTubeMusicCardPreviews: string[] = [];
  const markerRegex = /YouTube Music/gi;
  const markers = Array.from(text.matchAll(markerRegex)).map((match) => match.index ?? -1).filter((index) => index >= 0);
  const segments = markers.map((start, index) => {
    const next = markers[index + 1] ?? text.length;
    const raw = text.slice(start, next);
    const stopMatch = raw.match(/<(?:h1|h2|section|article|li|tr)\b|<div\b[^>]*class\s*=\s*["'][^"']*(?:outer-cell|content-cell)[^"']*["']/i);
    if (!stopMatch || stopMatch.index === 0) return raw;
    return raw.slice(0, stopMatch.index);
  });
  const listens: ParsedListen[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const segmentText = stripTagsWithBreaks(segment);
    if (!YOUTUBE_MUSIC_PATTERN.test(segmentText)) continue;

    const anchorMatches = Array.from(segment.matchAll(/<a\b[^>]*>(.*?)<\/a>/gis));
    const links = anchorMatches
      .map((match) => normalizeText(match[1].replace(/<[^>]+>/g, " ")))
      .filter(isMeaningfulHistoryLink);
    if (links.length < 2) {
      if (failedYouTubeMusicCardPreviews.length < 3) {
        failedYouTubeMusicCardPreviews.push(previewText(segmentText));
      }
      continue;
    }

    const timeRaw = findTimestampCandidate(segmentText);
    if (!timeRaw) {
      if (failedYouTubeMusicCardPreviews.length < 3) {
        failedYouTubeMusicCardPreviews.push(previewText(segmentText));
      }
      continue;
    }

    const listen = buildListen(links[0], links[1], timeRaw);
    if (!listen) {
      if (failedYouTubeMusicCardPreviews.length < 3) {
        failedYouTubeMusicCardPreviews.push(previewText(segmentText));
      }
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

  return { listens, failedYouTubeMusicCardPreviews };
};

export const parseHtmlHistoryForTest = async (text: string): Promise<ParsedListen[]> => {
  let doc: Document | null = null;

  try {
    doc = parseHtmlDocument(text);
  } catch {
    doc = null;
  }

  if (!doc) {
    throw new Error(htmlParseError);
  }

  const {
    totalCards,
    youtubeMusicCards,
    listens: domListens,
    skippedGeneralYouTubeCards: domSkippedGeneralYouTubeCards,
    failedYouTubeMusicCardPreviews: domFailedYouTubeMusicCardPreviews,
  } =
    await parseHtmlHistoryWithDom(doc);
  const {
    listens: fallbackListens,
    failedYouTubeMusicCardPreviews: fallbackFailedYouTubeMusicCardPreviews,
  } = domListens.length === 0 ? await parseHtmlHistoryWithFallback(text) : { listens: [], failedYouTubeMusicCardPreviews: [] };
  const parsedListens = domListens.length > 0 ? domListens : fallbackListens;

  console.debug("[takeout-html-parser]", {
    totalActivityCardsFound: totalCards,
    youtubeMusicCardsFound: youtubeMusicCards,
    parsedPlays: parsedListens.length,
    skippedGeneralYouTubeCards: domSkippedGeneralYouTubeCards,
    usedTextFallback: domListens.length === 0 && fallbackListens.length > 0,
    firstFailedYouTubeMusicCardPreviews:
      [...domFailedYouTubeMusicCardPreviews, ...fallbackFailedYouTubeMusicCardPreviews].slice(0, 3),
  });

  if (parsedListens.length === 0) {
    throw new Error(noMusicHistoryError);
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
  let text = await file.text();
  if (!text.trim()) {
    throw new Error("Uploaded file is empty.");
  }

  const format = detectFormat(file.name, text);
  if (!format) {
    throw new Error("Unsupported file format. Please upload a JSON or HTML Takeout history file.");
  }

  // For HTML files: if the UTF-8 read contains many replacement characters (U+FFFD),
  // the file may be windows-1252 encoded. Try re-decoding and use whichever has fewer artifacts.
  // normalizeMojibakeText is applied later to individual text nodes via normalizeText, not to raw HTML.
  if (format === "html") {
    const replacementCount = (text.match(/\ufffd/g) ?? []).length;
    // 0.5% threshold: more than 1 in 200 characters being replacement chars strongly indicates
    // a mis-decoded encoding (e.g., a windows-1252 file read as UTF-8).
    const mojibakeThreshold = 0.005;
    if (replacementCount / Math.max(text.length, 1) > mojibakeThreshold) {
      try {
        const buffer = await file.arrayBuffer();
        const w1252Text = new TextDecoder("windows-1252", { fatal: false }).decode(buffer);
        const w1252ReplacementCount = (w1252Text.match(/\ufffd/g) ?? []).length;
        if (w1252ReplacementCount < replacementCount) {
          text = w1252Text;
          console.debug("[takeout-html-parser] re-decoded as windows-1252 to reduce mojibake");
        }
      } catch {
        // Keep original UTF-8 text
      }
    }
  }

  return format === "json" ? parseJsonHistory(text) : parseHtmlHistoryForTest(text);
}
