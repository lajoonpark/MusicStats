"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RankedSong } from "@/types/music";
import { chartTooltipContentStyle, chartTooltipWrapperStyle, truncateLabel } from "@/lib/chart";
import { useMediaQuery } from "@/lib/useMediaQuery";

interface Props {
  data: RankedSong[];
}

export function TopSongsChart({ data }: Props) {
  const isSmallScreen = useMediaQuery("(max-width: 420px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  const maxLength = isSmallScreen ? 13 : isMobile ? 16 : 32;
  const chartData = data.map((song) => ({
    fullTitle: song.name,
    subtitle: song.artist,
    name: truncateLabel(song.name, maxLength),
    plays: song.plays,
  }));

  const chartHeight = Math.max(280, chartData.length * 36);

  return (
    <div className="min-h-[280px] w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: isMobile ? 8 : 18, left: isMobile ? 8 : 20, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis type="number" tick={{ fill: "#d4d4d8", fontSize: 12 }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#e4e4e7", fontSize: 12 }}
            tickMargin={8}
            width={isSmallScreen ? 105 : isMobile ? 130 : 180}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={chartTooltipContentStyle}
            wrapperStyle={chartTooltipWrapperStyle}
            labelFormatter={(_, payload) => {
              const fullTitle = payload?.[0]?.payload?.fullTitle ?? "";
              const artist = payload?.[0]?.payload?.subtitle ?? "";
              return artist ? `${fullTitle} — ${artist}` : fullTitle;
            }}
            formatter={(value) => [value, "Plays"]}
          />
          <Bar dataKey="plays" fill="#ef4444" radius={[0, 8, 8, 0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
