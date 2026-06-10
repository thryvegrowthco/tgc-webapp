"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  data: { service: string; rate: number; noShow: number; completed: number }[];
}

export function NoShowChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400 py-8 text-center">No completed or missed sessions in this range yet.</p>;
  }
  const chartData = data.map((d) => ({ ...d, pct: Math.round(d.rate * 1000) / 10 }));
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 44 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#94a3b8" fontSize={11} />
          <YAxis type="category" dataKey="service" width={150} stroke="#64748b" fontSize={11} />
          <Tooltip
            formatter={(value: unknown, _name: unknown, item: unknown) => {
              const p = (item as { payload?: { noShow?: number; completed?: number } } | undefined)?.payload;
              const ns = p?.noShow ?? 0;
              const total = ns + (p?.completed ?? 0);
              return [`${Number(value)}%  (${ns} of ${total})`, "No-show rate"];
            }}
            cursor={{ fill: "#fef2f2" }}
          />
          <Bar dataKey="pct" name="No-show rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
