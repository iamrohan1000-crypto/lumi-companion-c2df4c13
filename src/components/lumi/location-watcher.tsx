import { MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  distanceMeters,
  getLumiState,
  subscribeLumi,
  todayKey,
  type Place,
} from "@/lib/lumi-store";
import { pushNotify } from "@/lib/lumi-notify";
import { address, speak } from "@/lib/lumi-voice";

/** Phase 23 — watches the device position and fires place-based reminders. */
export function LocationWatcher() {
  const inside = useRef<Set<string>>(new Set());
  const announced = useRef<Set<string>>(new Set());

  useEffect(() => {
    let watchId: number | null = null;

    function start() {
      const { settings } = getLumiState();
      if (!settings.locationReminders || typeof navigator === "undefined" || !navigator.geolocation) {
        if (watchId !== null) {
          navigator.geolocation?.clearWatch(watchId);
          watchId = null;
        }
        return;
      }
      if (watchId !== null) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => handle(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
      );
    }

    function handle(lat: number, lng: number) {
      const { places, tasks } = getLumiState();
      const key = todayKey();
      for (const place of places) {
        const near = distanceMeters({ lat, lng }, place) <= (place.radius || 150);
        const was = inside.current.has(place.id);
        if (near === was) continue;
        if (near) inside.current.add(place.id);
        else inside.current.delete(place.id);

        const forPlace = tasks.filter(
          (t) => t.locationId === place.id && t.status === "pending" && t.date <= key,
        );
        if (forPlace.length === 0) continue;

        if (near) {
          fire(place, forPlace.map((t) => t.title), "arrive");
        } else {
          const leaving = forPlace.filter((t) => t.remindOnLeave);
          if (leaving.length) fire(place, leaving.map((t) => t.title), "leave");
        }
      }
    }

    function fire(place: Place, titles: string[], kind: "arrive" | "leave") {
      const stamp = `${place.id}-${kind}-${new Date().toISOString().slice(0, 13)}`;
      if (announced.current.has(stamp)) return;
      announced.current.add(stamp);
      const list = titles.slice(0, 3).join(", ");
      const line =
        kind === "arrive"
          ? `${address()}, you have arrived at ${place.name}. ${list}.`
          : `${address()}, you are leaving ${place.name} with ${list} unfinished.`;
      speak(line);
      toast(kind === "arrive" ? `At ${place.name}` : `Leaving ${place.name}`, {
        description: list,
        icon: <MapPin className="size-4" />,
      });
      void pushNotify(
        kind === "arrive" ? `Lumi · at ${place.name}` : `Lumi · leaving ${place.name}`,
        { body: list, tag: `lumi-place-${place.id}-${kind}` },
      );
    }

    start();
    const unsub = subscribeLumi(start);
    return () => {
      unsub();
      if (watchId !== null && typeof navigator !== "undefined") {
        navigator.geolocation?.clearWatch(watchId);
      }
    };
  }, []);

  return null;
}
