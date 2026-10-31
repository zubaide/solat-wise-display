import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { updateSettings } from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { JAKIM_ZONES } from "@/lib/prayer-utils";
import { useMosqueSettings } from "@/lib/display-data";

interface MonitorStatus {
  last_check: string | null;
  overall: "ok" | "warning" | "critical" | "unknown";
  disk?: { used_percent: number; used: string; total: string; status: string; action: string | null };
  temperature?: { celsius: number; status: string };
  clock?: { ntp_synced: boolean; status: string; message: string };
}

export const Route = createFileRoute("/admin/")({
  component: SettingsPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

function statusColor(s: string) {
  if (s === "ok") return "text-emerald-400";
  if (s === "warning") return "text-yellow-400";
  if (s === "critical") return "text-red-400";
  return "text-muted-foreground";
}

function badgeClass(s: string) {
  if (s === "ok") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (s === "warning") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (s === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
  return "bg-muted/20 text-muted-foreground border-muted/30";
}

function Dot({ s }: { s: string }) {
  return (
    <span className={[
      "inline-block h-2 w-2 rounded-full mr-2 flex-shrink-0",
      s === "ok" ? "bg-emerald-400" :
      s === "warning" ? "bg-yellow-400" :
      s === "critical" ? "bg-red-400 animate-pulse" :
      "bg-muted-foreground",
    ].join(" ")} />
  );
}

const CLOCK_OPTIONS = [
  { value: "digital-gold",   label: "Digital — Emas",  dot: "#c9a84c" },
  { value: "digital-green",  label: "Digital — Hijau", dot: "#6ee7b7" },
  { value: "digital-blue",   label: "Digital — Biru",  dot: "#60a5fa" },
  { value: "digital-silver", label: "Digital — Perak", dot: "#cbd5e1" },
] as const;

type PowerAction = "shutdown" | "restart";

function SettingsPage() {
  const { data, refetch, isLoading } = useMosqueSettings();

  const [form, setForm] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [monitor, setMonitor] = useState<MonitorStatus | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(true);
  const [powerBusy, setPowerBusy] = useState<PowerAction | null>(null);
  const [powerNotice, setPowerNotice] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const fetchMonitor = () => {
    setMonitorLoading(true);
    fetch("/api/admin/monitor", { credentials: "include" })
      .then((r) => r.json())
      .then(setMonitor)
      .catch(() => setMonitor({ last_check: null, overall: "unknown" }))
      .finally(() => setMonitorLoading(false));
  };

  useEffect(() => { fetchMonitor(); }, []);

  if (isLoading || !data) return <p className="text-muted-foreground">Memuatkan...</p>;

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      update("logo_url", url);
      toast.success("Logo berjaya dimuat naik");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat muat naik");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        data: {
          mosque_name: String(form.mosque_name ?? ""),
          mosque_address: String(form.mosque_address ?? ""),
          logo_url: String(form.logo_url ?? ""),
          zone: String(form.zone ?? "SGR02"),
          iqamah_subuh: Number(form.iqamah_subuh ?? 0),
          iqamah_zohor: Number(form.iqamah_zohor ?? 0),
          iqamah_asar: Number(form.iqamah_asar ?? 0),
          iqamah_maghrib: Number(form.iqamah_maghrib ?? 0),
          iqamah_isyak: Number(form.iqamah_isyak ?? 0),
          ticker_speed: Number(form.ticker_speed ?? 40),
          donation_goal: Number(form.donation_goal ?? 0),
          donation_current: Number(form.donation_current ?? 0),
          clock_face: String(form.clock_face ?? "digital-gold"),
          blackout_seconds: Number(form.blackout_seconds ?? 300),
          alert_email: String(form.alert_email ?? ""),
          islamic_event_interval_minutes: Number(form.islamic_event_interval_minutes ?? 2),
          islamic_event_duration_seconds: Number(form.islamic_event_duration_seconds ?? 20),
          font_scale: Number(form.font_scale ?? 100),
        },
      });
      toast.success("Tetapan disimpan");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat");
    } finally {
      setSaving(false);
    }
  };

  const powerAction = async (action: PowerAction) => {
    const message =
      action === "shutdown"
        ? "Matikan Raspberry Pi?\n\nPaparan akan berhenti dan Pi tidak boleh dihidupkan semula dari jauh. Anda perlu cabut dan pasang semula kuasa."
        : "Mulakan semula Raspberry Pi?\n\nPaparan akan kembali dalam kira-kira 1-2 minit.";
    if (!window.confirm(message)) return;

    setPowerBusy(action);
    setPowerNotice("");
    try {
      const res = await fetch("/api/admin/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPowerNotice(
        action === "shutdown"
          ? "Pi sedang dimatikan. Tunggu sehingga lampu hijau pada Pi berhenti berkelip sebelum mencabut kuasa."
          : "Pi sedang dimulakan semula. Muat semula halaman ini selepas 1-2 minit.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat");
      setPowerBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tetapan Masjid</h1>
        <p className="text-sm text-muted-foreground">Perubahan akan dipaparkan di skrin TV secara langsung.</p>
      </div>

      <div className="rounded-lg border border-input bg-surface-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">Status Sistem</h2>
            {monitor && (
              <span className={["text-xs font-medium px-2 py-0.5 rounded border uppercase", badgeClass(monitor.overall)].join(" ")}>
                {monitor.overall}
              </span>
            )}
          </div>
          <button
            onClick={fetchMonitor}
            disabled={monitorLoading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {monitorLoading ? "Menyemak..." : "↻ Muat Semula"}
          </button>
        </div>

        {monitor && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-input bg-background p-3">
                <p className="text-xs text-muted-foreground mb-1">Storan Disk</p>
                {monitor.disk ? (
                  <>
                    <p className={["flex items-center text-sm font-semibold", statusColor(monitor.disk.status)].join(" ")}>
                      <Dot s={monitor.disk.status} />{monitor.disk.used_percent}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{monitor.disk.used} / {monitor.disk.total}</p>
                    {monitor.disk.action && (
                      <p className="text-xs text-yellow-400 mt-1 truncate" title={monitor.disk.action}>
                        {monitor.disk.action}
                      </p>
                    )}
                  </>
                ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
              </div>

              <div className="rounded-md border border-input bg-background p-3">
                <p className="text-xs text-muted-foreground mb-1">Suhu CPU</p>
                {monitor.temperature ? (
                  <>
                    <p className={["flex items-center text-sm font-semibold", statusColor(monitor.temperature.status)].join(" ")}>
                      <Dot s={monitor.temperature.status} />{monitor.temperature.celsius}°C
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {monitor.temperature.status === "ok" ? "Normal" :
                       monitor.temperature.status === "warning" ? "Agak Panas" : "Terlalu Panas"}
                    </p>
                  </>
                ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
              </div>

              <div className="rounded-md border border-input bg-background p-3">
                <p className="text-xs text-muted-foreground mb-1">Jam Sistem</p>
                {monitor.clock ? (
                  <>
                    <p className={["flex items-center text-sm font-semibold", statusColor(monitor.clock.status)].join(" ")}>
                      <Dot s={monitor.clock.status} />
                      {monitor.clock.ntp_synced ? "Segerak" : "Tidak Segerak"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{monitor.clock.message}</p>
                  </>
                ) : <p className="text-xs text-muted-foreground">Belum ada data</p>}
              </div>
            </div>

            {monitor.last_check ? (
              <p className="text-xs text-muted-foreground">Semakan terakhir: {monitor.last_check}</p>
            ) : (
              <p className="text-xs text-yellow-400">
                Skrip pemantauan belum dijalankan. Mulakan dengan: ~/solat-wise-display/scripts/monitor.sh
              </p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">

        <div className="col-span-2">
          <Label>Logo Masjid</Label>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 overflow-hidden border border-gold/30">
              {form.logo_url ? (
                <img src={String(form.logo_url)} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl">☪</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "Memuat naik..." : "Muat Naik Logo"}
              </Button>
              {form.logo_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => update("logo_url", "")}>
                  Buang Logo (guna ☪ lalai)
                </Button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ""; }} />
          </div>
        </div>

        <div className="col-span-2">
          <Label>Nama Masjid</Label>
          <Input value={String(form.mosque_name ?? "")} onChange={(e) => update("mosque_name", e.target.value)}
            placeholder="cth: Surau Seri Tijanni" />
        </div>

        <div className="col-span-2">
          <Label>Teks Bawah Nama (Alamat / Kawasan)</Label>
          <Input value={String(form.mosque_address ?? "")} onChange={(e) => update("mosque_address", e.target.value)}
            placeholder="cth: Putra Heights, Subang Jaya" />
        </div>

        <div className="col-span-2">
          <Label>Zon JAKIM</Label>
          <select className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(form.zone ?? "")} onChange={(e) => update("zone", e.target.value)}>
            {JAKIM_ZONES.map((z) => (
              <option key={z.code} value={z.code}>{z.code} — {z.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Iqamah (minit selepas azan)</h2>
        </div>
        {(["subuh", "zohor", "asar", "maghrib", "isyak"] as const).map((p) => (
          <div key={p}>
            <Label className="capitalize">{p}</Label>
            <Input type="number" min={0} max={60}
              value={Number(form[`iqamah_${p}`] ?? 0)}
              onChange={(e) => update(`iqamah_${p}`, Number(e.target.value))} />
          </div>
        ))}

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Saiz Tulisan Paparan</h2>
        </div>
        <div className="col-span-2">
          <Label>Saiz Tulisan: {Number(form.font_scale ?? 100)}%</Label>
          <input
            type="range"
            min={80}
            max={150}
            step={5}
            value={Number(form.font_scale ?? 100)}
            onChange={(e) => update("font_scale", Number(e.target.value))}
            className="mt-2 w-full accent-gold"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>80%</span>
            <span>100% (lalai)</span>
            <span>150%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Besarkan supaya mudah dibaca dari jauh di TV. Tekan Simpan untuk melihat perubahan pada paparan.
          </p>
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Rupa Jam</h2>
        </div>
        <div className="col-span-2">
          <Label>Tema Jam</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {CLOCK_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" onClick={() => update("clock_face", opt.value)}
                className={["rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                  String(form.clock_face ?? "digital-gold") === opt.value
                    ? "border-gold bg-gold/20 text-gold"
                    : "border-input bg-background text-foreground hover:bg-accent",
                ].join(" ")}>
                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: opt.dot }} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Iqamah Lanjutan</h2>
        </div>
        <div>
          <Label>Tempoh Skrin Gelap (minit)</Label>
          <Input type="number" min={1} max={60}
            value={Math.max(1, Math.round(Number(form.blackout_seconds ?? 300) / 60))}
            onChange={(e) => update("blackout_seconds", Number(e.target.value) * 60)} />
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Paparan Acara Islam</h2>
        </div>
        <div>
          <Label>Selang Masa (minit)</Label>
          <Input type="number" min={1} max={60}
            value={Number(form.islamic_event_interval_minutes ?? 2)}
            onChange={(e) => update("islamic_event_interval_minutes", Number(e.target.value))} />
          <p className="mt-1 text-xs text-muted-foreground">Selang slide acara Islam muncul di TV. Lalai: 2 minit.</p>
        </div>
        <div>
          <Label>Tempoh Paparan (saat)</Label>
          <Input type="number" min={5} max={120}
            value={Number(form.islamic_event_duration_seconds ?? 20)}
            onChange={(e) => update("islamic_event_duration_seconds", Number(e.target.value))} />
          <p className="mt-1 text-xs text-muted-foreground">Berapa lama slide acara dipaparkan. Lalai: 20 saat.</p>
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Tabung & Ticker</h2>
        </div>
        <div>
          <Label>Sasaran Tabung (RM)</Label>
          <Input type="number" value={Number(form.donation_goal ?? 0)}
            onChange={(e) => update("donation_goal", Number(e.target.value))} />
        </div>
        <div>
          <Label>Kutipan Semasa (RM)</Label>
          <Input type="number" value={Number(form.donation_current ?? 0)}
            onChange={(e) => update("donation_current", Number(e.target.value))} />
        </div>
        <div>
          <Label>Kelajuan Ticker (saat)</Label>
          <Input type="number" value={Number(form.ticker_speed ?? 40)}
            onChange={(e) => update("ticker_speed", Number(e.target.value))} />
        </div>

        <div className="col-span-2 mt-2">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gold">Pemantauan & Amaran</h2>
        </div>
        <div className="col-span-2">
          <Label>E-mel Penerima Amaran</Label>
          <Input type="email" value={String(form.alert_email ?? "")}
            onChange={(e) => update("alert_email", e.target.value)}
            placeholder="cth: admin@gmail.com" />
          <p className="mt-1 text-xs text-muted-foreground">
            Amaran dihantar apabila suhu tinggi, storan penuh, atau jam tidak segerak. Mesti jalankan scripts/setup-email.sh dahulu.
          </p>
        </div>
      </div>

      <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>

      <div className="space-y-3 rounded-lg border border-red-500/30 bg-surface-2 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">Kawalan Sistem</h2>
        <p className="text-xs text-muted-foreground">
          Sentiasa guna butang ini sebelum memutuskan kuasa Pi. Mencabut kuasa terus boleh merosakkan kad SD.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={powerBusy !== null} onClick={() => powerAction("restart")}>
            {powerBusy === "restart" ? "Memulakan semula..." : "Mulakan Semula Pi"}
          </Button>
          <Button type="button" variant="destructive" disabled={powerBusy !== null} onClick={() => powerAction("shutdown")}>
            {powerBusy === "shutdown" ? "Mematikan..." : "Matikan Pi"}
          </Button>
        </div>
        {powerNotice && <p className="text-sm text-yellow-400">{powerNotice}</p>}
      </div>
    </div>
  );
}
