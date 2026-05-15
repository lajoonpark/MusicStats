"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RankedItem } from "@/types/music";

interface Props {
  data: RankedItem[];
}

export function TopArtistsChart({ data }: Props) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis type="number" tick={{ fill: "#d4d4d8" }} />
          <YAxis type="category" dataKey="name" tick={{ fill: "#e4e4e7" }} width={120} />
          <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }} />
          <Bar dataKey="plays" fill="#22c55e" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
