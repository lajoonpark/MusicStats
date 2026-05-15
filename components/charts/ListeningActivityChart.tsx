"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MonthlyStat } from "@/types/music";

interface Props {
  data: MonthlyStat[];
}

export function ListeningActivityChart({ data }: Props) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis dataKey="month" tick={{ fill: "#d4d4d8" }} />
          <YAxis tick={{ fill: "#d4d4d8" }} />
          <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46" }} />
          <Line type="monotone" dataKey="plays" stroke="#38bdf8" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
