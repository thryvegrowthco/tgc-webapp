"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Cell } from "recharts";

interface Props {
  stages: { label: string; count: number }[];
}

// Descending green shades read as a funnel.
const SHADES = ["#203e35", "#2f5a4c", "#4d9082", "#7db8ad", "#aed4cc", "#d6eae5"];

export function FunnelChart({ stages }: Props) {
  const total = stages.reduce((s, st) => s + st.count, 0);
  if (total === 0) {
    return <p className="text-sm text-neutral-400 py-8 text-center">No leads in this range yet.</p>;
  }
  return (
    <div className="w-full" style={{ height: stages.length * 40 + 40 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
          <YAxis type="category" dataKey="label" width={130} stroke="#64748b" fontSize={11} />
          <Tooltip cursor={{ fill: "#f0f7f5" }} />
          <Bar dataKey="count" name="Leads" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" fontSize={11} fill="#475569" />
            {stages.map((s, i) => (
              <Cell key={s.label} fill={SHADES[Math.min(i, SHADES.length - 1)]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
