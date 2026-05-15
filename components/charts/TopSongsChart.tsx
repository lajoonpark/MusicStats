"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RankedSong } from "@/types/music";

interface Props {
  data: RankedSong[];
}

export function TopSongsChart({ data }: Props) {
  const chartData = data.map((song) => ({
    name: song.name.length > 28 ? `${song.name.slice(0, 28)}…` : song.name,
    plays: song.plays,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="name" tick={{ fill: "#d4d4d8" }} interval={0} angle={-20} textAnchor="end" height={90} />
          <YAxis tick={{ fill: "#d4d4d8" }} />
          <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }} />
          <Bar dataKey="plays" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
