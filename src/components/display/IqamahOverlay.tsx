import { useEffect, useRef, useState } from "react";
import { parseTimeToToday, type PrayerSchedule } from "@/lib/prayer-utils";
import type { SettingsRow } from "@/lib/settings.functions";

interface Props {
  times: PrayerSchedule;
  settings: SettingsRow;
}

const IQAMAH_PRAYERS = [
  { key: "subuh",   label: "Subuh",   iqKey: "iqamah_subuh"   },
  { key: "zohor",   label: "Zohor",   iqKey: "iqamah_zohor"   },
  { key: "asar",    label: "Asar",    iqKey: "iqamah_asar"    },
  { key: "maghrib", label: "Maghrib", iqKey: "iqamah_maghrib" },
  { key: "isyak",   label: "Isyak",   iqKey: "iqamah_isyak"   },
] as const;

type Phase = "hidden" | "countdown" | "blackout";

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const go = () => {
      [0, 0.45, 0.9].forEach((t) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        g.gain.setValueAtTime(0.6, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.38);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
    };
    ctx.state === "suspended" ? ctx.resume().then(go).catch(() => {}) : go();
  } catch {}
}

export function IqamahOverlay({ times, settings }: Props) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [activeLabel, setActiveLabel] = useState("");

  // Refs so the interval never needs to restart when props change
  const timesRef = useRef(times);
  const settingsRef = useRef(settings);
  timesRef.current = times;
  settingsRef.current = settings;

  // Track beep by prayer key — resets only when outside all windows
  const beepedRef = useRef<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const s = settingsRef.current;
      const t = timesRef.current;
      const blackoutSecs = Number(s.blackout_seconds ?? 120);

      for (const { key, label, iqKey } of IQAMAH_PRAYERS) {
        const iqMins = Number(s[iqKey as keyof SettingsRow] ?? 0);
        if (!iqMins) continue;

        const prayerAt   = parseTimeToToday((t as any)[key]);
        const iqamahAt   = new Date(prayerAt.getTime() + iqMins * 60_000);
        const blackoutEnd = new Date(iqamahAt.getTime() + blackoutSecs * 1_000);

        if (now >= prayerAt && now < iqamahAt) {
          setPhase("countdown");
          setSecondsLeft(Math.floor((iqamahAt.getTime() - now.getTime()) / 1000));
          setActiveLabel(label);
          return;
        }

        if (now >= iqamahAt && now < blackoutEnd) {
          if (beepedRef.current !== key) {
            beepedRef.current = key;
            playBeep();
          }
          setPhase("blackout");
          return;
        }
      }

      // Outside all windows — allow next prayer to beep again
      beepedRef.current = "";
      setPhase("hidden");
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []); // intentionally empty — reads latest values via refs

  if (phase === "hidden") return null;

  if (phase === "blackout") {
    return <div className="fixed inset-0 z-[9999] bg-black" />;
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(Math.floor(secondsLeft % 60)).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 pt-10">
      <div className="rounded-2xl border border-gold/40 bg-background px-16 py-10 text-center shadow-elegant">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Iqamah</p>
        <p className="mt-1 text-4xl font-bold text-foreground">{activeLabel}</p>
        <p className="mt-4 font-display text-8xl font-extrabold tabular-nums text-gold">
          {mins}:{secs}
        </p>
        <p className="mt-3 text-base text-muted-foreground">Sila bersedia untuk solat berjemaah</p>
      </div>
    </div>
  );
}
