interface Props {
  messages: string[];
  emergency?: string | null;
}

export function Ticker({ messages, emergency }: Props) {
  const text = messages.join("   •   ");
  return (
    <div className={[
      "flex items-center gap-4 overflow-hidden border-t-2 px-6 py-3",
      emergency
        ? "border-danger bg-danger/15"
        : "border-gold/40 bg-surface-1/90",
    ].join(" ")}>
      <span className={[
        "shrink-0 rounded-md px-3 py-1 text-xs font-bold uppercase tracking-widest",
        emergency
          ? "bg-danger text-foreground"
          : "bg-gradient-gold text-primary-foreground",
      ].join(" ")}>
        {emergency ? "Notis Penting" : "Pengumuman"}
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-ticker whitespace-nowrap text-xl font-medium text-foreground">
          {emergency ?? text}
        </div>
      </div>
    </div>
  );
}