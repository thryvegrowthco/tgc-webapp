"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  used: number;
  total: number;
}

export function UtilizationDonut({ used, total }: Props) {
  if (total === 0) {
    return <p className="text-sm text-neutral-400 py-8 text-center">No package sessions in this range yet.</p>;
  }
  const available = Math.max(0, total - used);
  const pct = Math.round((used / total) * 100);
  const data = [
    { name: "Used", value: used },
    { name: "Available", value: available },
  ];
  const COLORS = ["#4d9082", "#d6eae5"];

  return (
    <div className="relative w-full" style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} startAngle={90} endAngle={-270}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: unknown, name: unknown) => [`${Number(value)} sessions`, String(name)]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="font-display text-2xl font-bold text-neutral-900">{pct}%</span>
        <span className="text-[11px] text-neutral-500">{used} of {total} used</span>
      </div>
    </div>
  );
}
