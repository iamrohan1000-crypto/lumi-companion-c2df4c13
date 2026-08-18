import { createFileRoute } from "@tanstack/react-router";
import { Music, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/lumi/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/lumi-notify";
import {
  address,
  listVoices,
  onVoicesReady,
  speak,
  speechSupported,
  stopSpeaking,
  type VoiceOption,
} from "@/lib/lumi-voice";
import { useLumi } from "@/lib/lumi-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Lumi" },
      { name: "description", content: "Personalize Lumi: your name, theme, daily goal and data." },
      { property: "og:title", content: "Settings — Lumi" },
      {
        property: "og:description",
        content: "Personalize Lumi: name, theme, daily goal and data.",
      },
    ],
  }),
  component: SettingsPage,
});

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Phase 18 — voice assistant controls. */
function VoiceSection() {
  const { settings, updateSettings } = useLumi();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const supported = speechSupported();

  useEffect(() => onVoicesReady(() => setVoices(listVoices())), []);

  const filtered = voices.filter(
    (v) => v.gender === settings.voiceGender || v.gender === "unknown",
  );

  return (
    <section className="surface-card overflow-hidden rounded-3xl">
      <Row title="Voice assistant" description="Lumi speaks reminders, briefings and reports">
        <Switch
          checked={settings.voiceEnabled}
          onCheckedChange={(v) => {
            updateSettings({ voiceEnabled: v });
            if (!v) stopSpeaking();
          }}
        />
      </Row>
      {!supported ? (
        <Row title="Not supported" description="This browser has no speech synthesis.">
          <span className="text-xs text-muted-foreground">—</span>
        </Row>
      ) : null}
      <Row title="Voice gender" description="Preferred system voice type">
        <div className="flex gap-2">
          {(["female", "male"] as const).map((g) => (
            <Button
              key={g}
              size="sm"
              variant={settings.voiceGender === g ? "default" : "outline"}
              className="press rounded-full capitalize"
              onClick={() => updateSettings({ voiceGender: g, voiceURI: undefined })}
            >
              {g}
            </Button>
          ))}
        </div>
      </Row>
      <Row title="Voice" description="Available system text-to-speech voices">
        <select
          value={settings.voiceURI ?? ""}
          onChange={(e) => updateSettings({ voiceURI: e.target.value || undefined })}
          className="h-9 w-52 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Auto ({settings.voiceGender})</option>
          {filtered.map((v) => (
            <option key={v.uri} value={v.uri}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </Row>
      <div className="border-b border-border px-5 py-4">
        <Label className="text-sm">Speed · {settings.voiceRate.toFixed(1)}x</Label>
        <Slider
          className="mt-3"
          min={0.5}
          max={2}
          step={0.1}
          value={[settings.voiceRate]}
          onValueChange={([v]) => updateSettings({ voiceRate: v ?? 1 })}
        />
      </div>
      <div className="border-b border-border px-5 py-4">
        <Label className="text-sm">Pitch · {settings.voicePitch.toFixed(1)}</Label>
        <Slider
          className="mt-3"
          min={0}
          max={2}
          step={0.1}
          value={[settings.voicePitch]}
          onValueChange={([v]) => updateSettings({ voicePitch: v ?? 1 })}
        />
      </div>
      <div className="border-b border-border px-5 py-4">
        <Label className="text-sm">Volume · {Math.round(settings.voiceVolume * 100)}%</Label>
        <Slider
          className="mt-3"
          min={0}
          max={1}
          step={0.05}
          value={[settings.voiceVolume]}
          onValueChange={([v]) => updateSettings({ voiceVolume: v ?? 1 })}
        />
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-4">
        <Button
          className="press bg-brand rounded-full text-primary-foreground hover:opacity-90"
          onClick={() =>
            speak(`Good morning ${address()}. Your study time has started.`, { force: true })
          }
        >
          <Volume2 className="size-4" />
          Test voice
        </Button>
        <Button variant="outline" className="press rounded-full" onClick={stopSpeaking}>
          Mute now
        </Button>
      </div>
    </section>
  );
}

function SettingsPage() {
  const { settings, updateSettings, tasks, clearAll } = useLumi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => setPermission(notificationPermission()), []);


  function pickRingtone(file?: File | null) {
    if (!file) return;
    if (file.size > 3_000_000) {
      toast.error("Pick an audio file under 3 MB so it fits in local storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ ringtoneData: String(reader.result), ringtoneName: file.name });
      toast.success(`Ringtone set to ${file.name}`);
    };
    reader.onerror = () => toast.error("Couldn't read that file.");
    reader.readAsDataURL(file);
  }

  return (
    <AppShell title="Settings" subtitle="Make Lumi feel like yours">
      <div className="flex flex-col gap-6">
        <section className="surface-card overflow-hidden rounded-3xl">
          <Row title="Your name" description="Used in your daily greeting">
            <Input
              value={settings.name}
              placeholder="Add name"
              className="w-40"
              onChange={(e) => updateSettings({ name: e.target.value })}
            />
          </Row>
          <Row title="Dark mode" description="Luminous night theme">
            <Switch
              checked={settings.theme === "dark"}
              onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
            />
          </Row>
          <Row title="Daily goal" description="Tasks you aim to finish each day">
            <Input
              type="number"
              min={1}
              max={30}
              value={settings.dailyGoal}
              className="w-24"
              onChange={(e) => updateSettings({ dailyGoal: Number(e.target.value) || 1 })}
            />
          </Row>
          <Row title="Reminders" description="Vibration, ringtone and persistent alerts">
            <Switch
              checked={settings.reminders}
              onCheckedChange={(v) => updateSettings({ reminders: v })}
            />
          </Row>
          <Row title="Snooze length" description="Minutes added when you postpone a task">
            <Input
              type="number"
              min={1}
              max={120}
              value={settings.snoozeMinutes}
              className="w-24"
              onChange={(e) =>
                updateSettings({ snoozeMinutes: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Row>
          <Row
            title="Task reminder lead"
            description="Default minutes before a task starts that Lumi alerts you"
          >
            <Input
              type="number"
              min={0}
              max={120}
              step={5}
              value={settings.taskReminderLead}
              className="w-24"
              onChange={(e) =>
                updateSettings({
                  taskReminderLead: Math.max(0, Math.min(120, Number(e.target.value) || 0)),
                })
              }
            />
          </Row>
          <Row
            title="Water reminder lead"
            description="Default minutes before a water break that Lumi alerts you"
          >
            <Input
              type="number"
              min={0}
              max={60}
              step={5}
              value={settings.waterReminderLead}
              className="w-24"
              onChange={(e) =>
                updateSettings({
                  waterReminderLead: Math.max(0, Math.min(60, Number(e.target.value) || 0)),
                })
              }
            />
          </Row>
          <Row title="Water target" description="Glasses of water you aim for each day">
            <Input
              type="number"
              min={1}
              max={30}
              value={settings.waterGoal}
              className="w-24"
              onChange={(e) =>
                updateSettings({ waterGoal: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Row>
          <Row
            title="AI smart scheduler"
            description="Auto-arrange your day and rearrange around new tasks"
          >
            <Switch
              checked={settings.autoSchedule}
              onCheckedChange={(v) => updateSettings({ autoSchedule: v })}
            />
          </Row>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <p className="font-display text-lg font-semibold">Reminder ringtone</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {settings.ringtoneName
              ? `Using "${settings.ringtoneName}" from your device.`
              : "No ringtone chosen — Lumi plays a built-in chime once."}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => pickRingtone(e.target.files?.[0])}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="press rounded-full"
              onClick={() => fileRef.current?.click()}
            >
              <Music className="size-4" />
              Choose from device
            </Button>
            {settings.ringtoneData ? (
              <>
                <Button
                  variant="outline"
                  className="press rounded-full"
                  onClick={() => void new Audio(settings.ringtoneData).play()}
                >
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  className="press rounded-full"
                  onClick={() => {
                    updateSettings({ ringtoneData: undefined, ringtoneName: undefined });
                    toast.success("Ringtone removed");
                  }}
                >
                  Remove
                </Button>
              </>
            ) : null}
          </div>
        </section>

        <VoiceSection />

        <section className="surface-card overflow-hidden rounded-3xl">
          <Row title="Morning briefing" description="Spoken greeting and schedule">
            <Switch
              checked={settings.briefingEnabled}
              onCheckedChange={(v) => updateSettings({ briefingEnabled: v })}
            />
          </Row>
          <Row title="Briefing time" description="When Lumi greets you">
            <Input
              type="time"
              value={settings.briefingTime}
              className="w-32"
              onChange={(e) => updateSettings({ briefingTime: e.target.value })}
            />
          </Row>
          <Row title="Night summary" description="Spoken recap of your day">
            <Switch
              checked={settings.nightEnabled}
              onCheckedChange={(v) => updateSettings({ nightEnabled: v })}
            />
          </Row>
          <Row title="Night summary time" description="When Lumi wraps up the day">
            <Input
              type="time"
              value={settings.nightTime}
              className="w-32"
              onChange={(e) => updateSettings({ nightTime: e.target.value })}
            />
          </Row>
          <Row title="Focus mode" description="Full-screen focus when an important task starts">
            <Switch
              checked={settings.focusMode}
              onCheckedChange={(v) => updateSettings({ focusMode: v })}
            />
          </Row>
          <Row title="Dim screen in focus" description="Lower brightness to reduce distraction">
            <Switch
              checked={settings.focusDim}
              onCheckedChange={(v) => updateSettings({ focusDim: v })}
            />
          </Row>
          <Row
            title="System notifications"
            description="Reminders show even when the app is in the background"
          >
            <Switch
              checked={settings.notifications && permission === "granted"}
              onCheckedChange={async (v) => {
                if (!v) return updateSettings({ notifications: false });
                const result = await requestNotificationPermission();
                setPermission(result);
                if (result === "granted") {
                  updateSettings({ notifications: true });
                  toast.success("Notifications enabled");
                } else if (result === "unsupported") {
                  toast.error("This browser doesn't support notifications.");
                } else {
                  toast.error("Notification permission was blocked.");
                }
              }}
            />
          </Row>
        </section>

        <section className="surface-card rounded-3xl p-5">
          <p className="font-display text-lg font-semibold">Your data</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} stored privately on this device. No
            account, no cloud.
          </p>
          <Button
            variant="destructive"
            className="press mt-4 rounded-full"
            onClick={() => {
              clearAll();
              toast.success("All tasks cleared");
            }}
          >
            Clear all tasks
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
