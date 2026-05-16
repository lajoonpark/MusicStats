import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, children, className }: Props) {
  return (
    <section className={`glass-card min-h-[22rem] p-4 sm:p-6 ${className ?? ""}`}>
      <h3 className="mb-2 text-lg font-semibold sm:text-xl">{title}</h3>
      {description ? <p className="mb-4 text-sm text-zinc-400">{description}</p> : null}
      {children}
    </section>
  );
}
