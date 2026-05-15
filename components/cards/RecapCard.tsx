"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { MusicSummary, PersonalityResult } from "@/types/music";

interface Props {
  summary: MusicSummary;
  personality: PersonalityResult;
}

export function RecapCard({ summary, personality }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "youtube-music-stats-recap.png";
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="glass-card p-6">
      <h3 className="mb-4 text-xl font-semibold">Share Card</h3>
      <div
        ref={cardRef}
        className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-[#0f172a] via-[#1d4ed8]/20 to-[#059669]/20 p-6"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">YouTube Music Stats</p>
        <h4 className="mt-3 text-2xl font-bold">Your Personal Recap</h4>
        <div className="mt-5 space-y-2 text-zinc-100">
          <p>Top Artist: {summary.topArtist?.name ?? "-"}</p>
          <p>Top Song: {summary.topSong?.name ?? "-"}</p>
          <p>Total Plays: {summary.totalPlays.toLocaleString()}</p>
          <p>Favorite Hour: {summary.favoriteHour}:00</p>
          <p>Music Personality: {personality.labels[0]}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={downloadPng}
        disabled={downloading}
        className="mt-4 inline-flex rounded-full bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading ? "Generating PNG..." : "Download as PNG"}
      </button>
    </section>
  );
}
