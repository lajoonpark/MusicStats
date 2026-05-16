"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonthlyStat } from "@/types/music";
import { chartTooltipContentStyle, chartTooltipWrapperStyle } from "@/lib/chart";
import { useMediaQuery } from "@/lib/useMediaQuery";

interface Props {
  data: MonthlyStat[];
}

export function ListeningActivityChart({ data }: Props) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className="h-72 min-h-[280px] w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: isMobile ? 8 : 18, left: isMobile ? -14 : 0, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="month" tick={{ fill: "#d4d4d8", fontSize: 12 }} minTickGap={24} />
          <YAxis tick={{ fill: "#d4d4d8", fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={chartTooltipContentStyle} wrapperStyle={chartTooltipWrapperStyle} />
          <Line type="monotone" dataKey="plays" stroke="#38bdf8" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
