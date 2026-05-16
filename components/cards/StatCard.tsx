import { ReactNode } from "react";
import { AnimatedNumber } from "@/components/cards/AnimatedNumber";

interface Props {
  label: string;
  value: number;
  icon: ReactNode;
}

export function StatCard({ label, value, icon }: Props) {
  return (
    <div className="glass-card p-4 transition hover:-translate-y-0.5 hover:border-zinc-500/70 sm:p-5">
      <div className="mb-3 whitespace-nowrap text-sm text-zinc-400">{label}</div>
      <div className="flex items-center justify-between">
        <p className="text-xl font-semibold text-zinc-100 sm:text-2xl">
          <AnimatedNumber value={value} />
        </p>
        <span className="text-zinc-300">{icon}</span>
      </div>
    </div>
  );
}
