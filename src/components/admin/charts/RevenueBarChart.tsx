"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  data: { service: string; revenueCents: number }[];
}

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

export function RevenueBarChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-sm text-neutral-400 py-8 text-center">No revenue in this range yet.</p>;
  }
  return (
    <div className="w-full" style={{ height: Math.max(160, data.length * 44 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tickFormatter={(v) => fmt(v)} stroke="#94a3b8" fontSize={11} />
          <YAxis type="category" dataKey="service" width={150} stroke="#64748b" fontSize={11} />
          <Tooltip formatter={(value: unknown) => fmt(Number(value))} cursor={{ fill: "#f0f7f5" }} />
          <Bar dataKey="revenueCents" name="Revenue" fill="#4d9082" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
