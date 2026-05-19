import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseHtmlHistoryForTest } from "@/lib/parser";

const fixture = (name: string) =>
  readFileSync(path.join(process.cwd(), "fixtures", name), "utf8");

const hasDomParser = typeof DOMParser !== "undefined";

test("parses a YouTube Music takeout card", { skip: !hasDomParser }, async () => {
  const html = fixture("google-takeout-watch-history-youtube-music-card.html");
  const parsed = await parseHtmlHistoryForTest(html);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.song, "PANIC");
  assert.equal(parsed[0]?.artist, "Dabih");
});

test("ignores general YouTube cards", { skip: !hasDomParser }, async () => {
  const html = fixture("google-takeout-watch-history-youtube-only-card.html");

  await assert.rejects(async () => {
    await parseHtmlHistoryForTest(html);
  }, /No YouTube Music history was found/);
});
