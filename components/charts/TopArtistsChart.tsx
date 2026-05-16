"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RankedItem } from "@/types/music";
import { chartTooltipContentStyle, chartTooltipWrapperStyle, truncateLabel } from "@/lib/chart";
import { useMediaQuery } from "@/lib/useMediaQuery";

interface Props {
  data: RankedItem[];
}

export function TopArtistsChart({ data }: Props) {
  const isSmallScreen = useMediaQuery("(max-width: 420px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  const maxLength = isSmallScreen ? 14 : isMobile ? 18 : 30;
  const chartData = data.map((artist) => ({
    fullName: artist.name,
    name: truncateLabel(artist.name, maxLength),
    plays: artist.plays,
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
            width={isSmallScreen ? 110 : isMobile ? 135 : 180}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={chartTooltipContentStyle}
            wrapperStyle={chartTooltipWrapperStyle}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
          />
          <Bar dataKey="plays" fill="#22c55e" radius={[0, 8, 8, 0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
