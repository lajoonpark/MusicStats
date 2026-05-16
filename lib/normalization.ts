const junkPatterns = [
  /\(official\s*(music\s*)?video\)/gi,
  /\[official\s*(music\s*)?video\]/gi,
  /\(official\s*audio\)/gi,
  /\[official\s*audio\]/gi,
  /\(lyrics?\)/gi,
  /\[lyrics?\]/gi,
  /\b(HD|4K|1080p|video clip|mv)\b/gi,
  /\|\s*official.*/gi,
];

const separators = [" - ", " – ", " — ", " by "];

const collapseSpace = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u00c2(?=\s|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeTitle(raw: string): string {
  if (!raw) return "Unknown Song";

  let title = raw
    .replace(/^watched[\s\u00a0\u00c2]*/i, "")
    .replace(/^listened[\s\u00a0\u00c2]*to[\s\u00a0\u00c2]*/i, "")
    .replace(/^music\s+/i, "");

  for (const pattern of junkPatterns) {
    title = title.replace(pattern, "");
  }

  title = title
    .replace(/\s+ft\.?\s+.+$/i, "")
    .replace(/\s+feat\.?\s+.+$/i, "")
    .replace(/\s*\([^)]*remaster[^)]*\)/gi, "")
    .replace(/\s*\[[^\]]*remaster[^\]]*\]/gi, "");

  return collapseSpace(title);
}

export function normalizeArtist(raw?: string): string {
  if (!raw) return "Unknown Artist";

  return collapseSpace(
    raw
      .replace(/^by\s+/i, "")
      .replace(/^artist\s*[:\-]\s*/i, "")
      .replace(/\s*[-–—]\s*topic$/i, "")
      .replace(/\s*\(topic\)$/i, ""),
  );
}

export function splitSongAndArtist(
  rawTitle: string,
  rawArtist?: string,
): { song: string; artist: string } {
  const cleanArtist = normalizeArtist(rawArtist);
  const cleanedTitle = normalizeTitle(rawTitle);

  if (cleanArtist !== "Unknown Artist") {
    return { song: cleanedTitle, artist: cleanArtist };
  }

  for (const separator of separators) {
    if (!cleanedTitle.includes(separator)) continue;

    const [left, right] = cleanedTitle
      .split(separator)
      .map((part) => normalizeTitle(part));

    if (!left || !right) continue;

    const artistFirst = /topic$|records$|vevo$/i.test(left);
    if (artistFirst) {
      return {
        song: right,
        artist: normalizeArtist(left),
      };
    }

    return {
      song: left,
      artist: normalizeArtist(right),
    };
  }

  return {
    song: cleanedTitle,
    artist: "Unknown Artist",
  };
}

export function buildSongKey(song: string, artist: string): string {
  return `${normalizeTitle(song).toLowerCase()}::${normalizeArtist(artist).toLowerCase()}`;
}
