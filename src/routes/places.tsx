import { createFileRoute } from "@tanstack/react-router";
import { LocateFixed, MapPin, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PLACE_PRESETS, useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/places")({
  head: () => ({
    meta: [
      { title: "Location Reminders — Lumi" },
      {
        name: "description",
        content:
          "Save Home, Office, College, Gym or Market and let Lumi remind you of tasks when you arrive or leave.",
      },
      { property: "og:title", content: "Location Reminders — Lumi" },
      {
        property: "og:description",
        content: "Attach places to tasks and get reminded the moment you arrive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlacesPage,
});

function PlacesPage() {
  const { places, tasks, addPlace, updatePlace, removePlace, settings, updateSettings } = useLumi();
  const [name, setName] = useState("Home");
  const [icon, setIcon] = useState("🏠");
  const [radius, setRadius] = useState(150);
  const [busy, setBusy] = useState(false);

  function saveHere() {
    if (!navigator.geolocation) {
      toast.error("This device can't share its location.");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        addPlace({
          name: name.trim() || "Place",
          icon,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radius,
        });
        setBusy(false);
        toast.success(`${name} saved at your current position`);
      },
      () => {
        setBusy(false);
        toast.error("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <AppShell title="Location reminders" subtitle="Lumi nudges you when you arrive or leave">
      <section className="surface-card rounded-3xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Location reminders</p>
            <p className="text-xs text-muted-foreground">
              Watches your position in the background while the app is open.
            </p>
          </div>
          <Switch
            checked={settings.locationReminders}
            onCheckedChange={(v) => {
              updateSettings({ locationReminders: v });
              if (v) navigator.geolocation?.getCurrentPosition(() => {}, () => {});
            }}
          />
        </div>
      </section>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display text-lg font-semibold">Save a place</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PLACE_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setName(p.name);
                setIcon(p.icon);
              }}
              className={`press rounded-full border border-border px-4 py-2 text-sm ${
                name === p.name ? "bg-brand text-primary-foreground" : "bg-card"
              }`}
            >
              {p.icon} {p.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="place-name">Name</Label>
            <Input id="place-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="place-radius">Radius (metres)</Label>
            <Input
              id="place-radius"
              type="number"
              min={50}
              max={2000}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value) || 150)}
            />
          </div>
        </div>

        <Button
          onClick={saveHere}
          disabled={busy}
          className="press bg-brand mt-4 rounded-full text-primary-foreground hover:opacity-90"
        >
          <LocateFixed className="size-4" />
          {busy ? "Reading position…" : "Save my current position"}
        </Button>
      </section>

      <section className="surface-card mt-6 rounded-3xl p-5">
        <h2 className="font-display text-lg font-semibold">Saved places</h2>
        {places.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No places saved yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {places.map((p) => {
              const count = tasks.filter((t) => t.locationId === p.id && t.status === "pending").length;
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.icon} {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <MapPin className="mr-1 inline size-3" />
                      {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · {p.radius}m · {count} pending task
                      {count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-9 w-24"
                      value={p.radius}
                      onChange={(e) => updatePlace(p.id, { radius: Number(e.target.value) || 150 })}
                    />
                    <button
                      type="button"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => removePlace(p.id)}
                      className="press grid size-9 place-items-center rounded-full bg-destructive/15 text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
