export function LumiOrb({ speaking = false, size = 64 }: { speaking?: boolean; size?: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div className="bg-ember absolute inset-0 rounded-full opacity-30 blur-xl animate-breathe" />
      <div
        className={`bg-ember absolute inset-[18%] rounded-full shadow-glow ${
          speaking ? "animate-flicker" : "animate-breathe"
        }`}
      />
      <div className="absolute inset-[34%] rounded-full bg-background/40 blur-[2px]" />
    </div>
  );
}
