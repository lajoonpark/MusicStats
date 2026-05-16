"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RankedItem } from "@/types/music";
import { chartTooltipContentStyle, chartTooltipWrapperStyle, truncateLabel } from "@/lib/chart";
import { useMediaQuery } from "@/lib/useMediaQuery";

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#f43f5e", "#eab308"];

interface Props {
  data: RankedItem[];
}

export function ArtistDistributionChart({ data }: Props) {
  const isSmallScreen = useMediaQuery("(max-width: 420px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className="h-72 min-h-[280px] w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={data}
            dataKey="plays"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={isSmallScreen ? 86 : isMobile ? 98 : 112}
            label={!isMobile ? ({ name }) => truncateLabel(String(name), 18) : false}
            labelLine={!isMobile}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipContentStyle} wrapperStyle={chartTooltipWrapperStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
