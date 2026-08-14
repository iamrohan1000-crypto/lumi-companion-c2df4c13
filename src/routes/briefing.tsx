import { createFileRoute, Link } from "@tanstack/react-router";
import { BatteryMedium, CloudSun, Droplets, Sparkles, Sun, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { minutesOf, motivationFor, todayKey, useLumi } from "@/lib/lumi-store";
import { address, speak, stopSpeaking } from "@/lib/lumi-voice";

export const Route = createFileRoute("/briefing")({
  head: () => ({
    meta: [
      { title: "Morning Briefing — Lumi" },
      {
        name: "description",
        content:
          "Lumi's AI morning briefing: today's schedule, important tasks, weather, water goal and free hours.",
      },
      { property: "og:title", content: "Morning Briefing — Lumi" },
      {
        property: "og:description",
        content: "Start the day with Lumi's spoken schedule, weather and motivation.",
      },
    ],
  }),
  component: BriefingPage,
});

type Weather = { temp: number; text: string } | null;

const WEATHER_TEXT: Record<number, string> = {
  0: "clear sky",
  1: "mostly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy",
  51: "light drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  80: "rain showers",
  95: "thunderstorms",
};

function useWeather() {
  const [weather, setWeather] = useState<Weather>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,weather_code`,
          );
          const json = (await res.json()) as {
            current?: { temperature_2m: number; weather_code: number };
          };
          if (cancelled || !json.current) return;
          setWeather({
            temp: Math.round(json.current.temperature_2m),
            text: WEATHER_TEXT[json.current.weather_code] ?? "mixed conditions",
          });
        } catch {
          /* weather is optional */
        }
      },
      () => {},
      { timeout: 8000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return weather;
}

function useBattery() {
  const [battery, setBattery] = useState<number | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; addEventListener: (e: string, f: () => void) => void }>;
    };
    if (!nav.getBattery) return;
    let cancelled = false;
    void nav.getBattery().then((b) => {
      if (cancelled) return;
      const read = () => setBattery(Math.round(b.level * 100));
      read();
      b.addEventListener("levelchange", read);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return battery;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="surface-card rounded-2xl p-4">
      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="font-display mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function useBriefingData() {
  const { tasks, settings, water } = useLumi();
  const key = todayKey();
  return useMemo(() => {
    const today = tasks.filter((t) => t.date === key);
    const important = today.filter((t) => t.important || t.priority === "high");
    const pending = tasks.filter((t) => t.status === "pending" && t.date < key);
    const busyMinutes = today
      .filter((t) => t.status === "pending" || t.status === "completed")
      .reduce((s, t) => s + (t.duration || 30), 0);
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const freeMinutes = Math.max(0, 16 * 60 - busyMinutes);
    const next = today
      .filter((t) => t.status === "pending" && t.time && minutesOf(t.time) >= nowMin)
      .sort((a, b) => minutesOf(a.time!) - minutesOf(b.time!))[0];
    return {
      today,
      important,
      pending,
      next,
      busyHours: Math.round((busyMinutes / 60) * 10) / 10,
      freeHours: Math.round((freeMinutes / 60) * 10) / 10,
      glasses: water[key] ?? 0,
      waterGoal: settings.waterGoal,
    };
  }, [tasks, settings.waterGoal, water, key]);
}

export function briefingScript(
  data: ReturnType<typeof useBriefingData>,
  weather: Weather,
  battery: number | null,
) {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const parts = [
    `Good morning ${address()}.`,
    `It is ${time}.`,
    `You have ${data.today.length} task${data.today.length === 1 ? "" : "s"} today,`,
    `${data.important.length} of them important.`,
  ];
  if (data.pending.length) parts.push(`${data.pending.length} tasks are still pending from before.`);
  if (weather) parts.push(`It is ${weather.temp} degrees with ${weather.text}.`);
  if (battery !== null) parts.push(`Your battery is at ${battery} percent.`);
  parts.push(`Your water goal is ${data.waterGoal} glasses.`);
  parts.push(
    `Estimated busy time ${data.busyHours} hours, with about ${data.freeHours} hours free.`,
  );
  if (data.next?.time) parts.push(`First up, ${data.next.title} at ${data.next.time}.`);
  parts.push(motivationFor(todayKey()));
  return parts.join(" ");
}

function BriefingPage() {
  const data = useBriefingData();
  const weather = useWeather();
  const battery = useBattery();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const read = () =>
      setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AppShell title="Morning Briefing" subtitle={`Good morning, ${address()}`}>
      <div className="flex flex-col gap-6">
        <section className="surface-card glow rounded-3xl p-6">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Today at a glance
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold">{clock}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <p className="font-display mt-4 text-base font-medium text-primary">
            {motivationFor(todayKey())}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
              onClick={() => speak(briefingScript(data, weather, battery), { force: true })}
            >
              <Volume2 className="size-4" />
              Speak briefing
            </Button>
            <Button variant="outline" className="press rounded-full" onClick={stopSpeaking}>
              Stop
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<Sparkles className="size-3.5" />} label="Tasks today" value={`${data.today.length}`} />
          <Stat icon={<Sparkles className="size-3.5" />} label="Important" value={`${data.important.length}`} />
          <Stat icon={<Sparkles className="size-3.5" />} label="Pending" value={`${data.pending.length}`} />
          <Stat
            icon={<Droplets className="size-3.5" />}
            label="Water"
            value={`${data.glasses}/${data.waterGoal}`}
          />
          <Stat
            icon={<CloudSun className="size-3.5" />}
            label="Weather"
            value={weather ? `${weather.temp}° ${weather.text}` : "—"}
          />
          <Stat
            icon={<BatteryMedium className="size-3.5" />}
            label="Battery"
            value={battery === null ? "—" : `${battery}%`}
          />
          <Stat icon={<Sun className="size-3.5" />} label="Busy hours" value={`${data.busyHours}h`} />
          <Stat icon={<Sun className="size-3.5" />} label="Free hours" value={`${data.freeHours}h`} />
        </div>

        <section className="surface-card rounded-3xl p-5">
          <p className="font-display text-lg font-semibold">Today's schedule</p>
          {data.today.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing planned yet.{" "}
              <Link to="/today" className="text-primary underline underline-offset-4">
                Build today's routine
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {[...data.today]
                .sort((a, b) => minutesOf(a.time ?? "23:59") - minutesOf(b.time ?? "23:59"))
                .map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3"
                  >
                    <span className="min-w-0 truncate text-sm">
                      {t.important ? "⭐ " : ""}
                      {t.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{t.time ?? "—"}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
