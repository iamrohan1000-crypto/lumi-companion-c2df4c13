import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { buildStats, useLumi, type StatRange } from "@/lib/lumi-store";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics — Lumi" },
      {
        name: "description",
        content:
          "Weekly, monthly and yearly charts for completed tasks, working hours, water, washroom and productivity.",
      },
      { property: "og:title", content: "Statistics — Lumi" },
      {
        property: "og:description",
        content: "Track your discipline over weeks, months and years with Lumi's charts.",
      },
    ],
  }),
  component: StatsPage,
});

const RANGES: { value: StatRange; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="surface-card rounded-3xl p-5">
      <p className="font-display mb-4 text-base font-semibold">{title}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  color: "var(--foreground)",
  fontSize: 12,
};

function StatsPage() {
  const { tasks, water, washroom } = useLumi();
  const [range, setRange] = useState<StatRange>("weekly");
  const data = buildStats(tasks, water, washroom, range);

  const totals = data.reduce(
    (acc, d) => ({
      completed: acc.completed + d.completed,
      hours: Math.round((acc.hours + d.hours) * 10) / 10,
      water: acc.water + d.water,
      washroom: acc.washroom + d.washroom,
    }),
    { completed: 0, hours: 0, water: 0, washroom: 0 },
  );

  return (
    <AppShell
      title="Statistics"
      subtitle={`${totals.completed} completed · ${totals.hours}h worked · ${totals.water} glasses · ${totals.washroom} visits`}
      action={
        <div className="flex gap-1 rounded-full border border-border p-1">
          {RANGES.map((r) => (
            <Button
              key={r.value}
              size="sm"
              variant={range === r.value ? "default" : "ghost"}
              onClick={() => setRange(r.value)}
              className={
                range === r.value
                  ? "press bg-brand rounded-full text-primary-foreground hover:opacity-90"
                  : "press rounded-full"
              }
            >
              {r.label}
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Tasks by status">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="completed" stackId="a" fill="var(--chart-3)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pending" stackId="a" fill="var(--chart-4)" />
            <Bar dataKey="cancelled" stackId="a" fill="var(--chart-5)" />
            <Bar dataKey="missed" stackId="a" fill="var(--destructive)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Working hours">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="var(--chart-1)"
              fill="var(--chart-1)"
              fillOpacity={0.25}
            />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Water & washroom">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="water" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="washroom" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Productivity score">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axis} />
            <YAxis domain={[0, 100]} {...axis} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="productivity"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ChartCard>
      </div>
    </AppShell>
  );
}
