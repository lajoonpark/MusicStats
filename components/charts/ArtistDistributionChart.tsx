"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RankedItem } from "@/types/music";

const COLORS = ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#f43f5e", "#eab308"];

interface Props {
  data: RankedItem[];
}

export function ArtistDistributionChart({ data }: Props) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="plays" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
