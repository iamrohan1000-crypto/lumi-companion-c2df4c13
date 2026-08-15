import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  History,
  LayoutDashboard,
  Moon,
  Droplets,
  DoorOpen,
  Settings,
  Sun,
  Sparkles,
  Sunrise,
  Timer,
  BarChart3,
  Flame,
  MapPin,
  Mic,
  Search,
  CalendarDays,
  DatabaseBackup,
  Focus,
  Brain,
  MessageSquare,
  CalendarRange,
  LineChart,
  LayoutPanelTop,
} from "lucide-react";
import type { ReactNode } from "react";

import logo from "@/assets/lumi-logo.png.asset.json";
import { cn } from "@/lib/utils";
import { useLumi } from "@/lib/lumi-store";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/executive", label: "Executive", icon: LayoutPanelTop },
  { to: "/manager", label: "AI Manager", icon: MessageSquare },
  { to: "/autoplan", label: "AI Auto Plan", icon: Wand2 },

  { to: "/briefing", label: "Morning Briefing", icon: Sunrise },
  { to: "/today", label: "Today", icon: Sunrise },
  { to: "/tomorrow", label: "Tomorrow", icon: CalendarClock },
  { to: "/pending", label: "Pending", icon: Timer },
  { to: "/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/habits", label: "Habits", icon: Flame },
  { to: "/report", label: "Daily Report", icon: Sparkles },
  { to: "/night-summary", label: "Night Summary", icon: Moon },
  { to: "/stats", label: "Statistics", icon: BarChart3 },
  { to: "/analysis", label: "AI Analysis", icon: Brain },
  { to: "/weekly-review", label: "Weekly Review", icon: CalendarRange },
  { to: "/monthly-review", label: "Monthly Review", icon: LineChart },
  { to: "/water", label: "Water", icon: Droplets },
  { to: "/washroom", label: "Washroom", icon: DoorOpen },
  { to: "/search", label: "Search", icon: Search },
  { to: "/voice", label: "Voice Task", icon: Mic },
  { to: "/focus-history", label: "Focus History", icon: Focus },
  { to: "/places", label: "Locations", icon: MapPin },
  { to: "/calendar", label: "Calendar Sync", icon: CalendarDays },
  { to: "/backup", label: "Backup", icon: DatabaseBackup },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV = NAV.filter((n) =>
  ["/", "/today", "/search", "/voice", "/report"].includes(n.to),
);

function ThemeToggle() {
  const { settings, updateSettings } = useLumi();
  const dark = settings.theme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
      className="press grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="aurora min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-4 pb-28 pt-6 md:px-6 lg:pb-10">
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col lg:flex">
          <Link to="/" className="mb-8 flex items-center gap-3">
            <img
              src={logo.url}
              alt="Lumi logo"
              className="size-11 rounded-2xl glow"
              width={44}
              height={44}
            />
            <span>
              <span className="block font-display text-lg font-semibold leading-none">Lumi</span>
              <span className="text-xs text-muted-foreground">Your AI. Your Day.</span>
            </span>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "press flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    active && "bg-brand text-primary-foreground glow hover:bg-brand",
                  )}
                >
                  <Icon className="size-4.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={logo.url}
                alt="Lumi logo"
                className="size-11 rounded-2xl glow lg:hidden"
                width={44}
                height={44}
              />
              <div>
                <h1 className="font-display text-2xl font-semibold md:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {action}
              <ThemeToggle />
            </div>
          </header>

          <div className="rise">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between px-3 py-2">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "press flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-full transition-colors",
                    active && "bg-brand text-primary-foreground glow",
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
