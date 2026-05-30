import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { updateSettings } from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { JAKIM_ZONES } from "@/lib/prayer-utils";
import { useMosqueSettings } from "@/lib/display-data";

export const Route = createFileRoute("/admin/")({
  component: SettingsPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

function SettingsPage() {
  const { data, refetch, isLoading } = useMosqueSettings();
  const [form, setForm] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  if (isLoading || !data) return <p className="text-muted-foreground">Memuatkan...</p>;

  const update = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({ data: {
        mosque_name: String(form.mosque_name ?? ""),
        zone: String(form.zone ?? "SGR02"),
        iqamah_subuh: Number(form.iqamah_subuh ?? 0),
        iqamah_zohor: Number(form.iqamah_zohor ?? 0),
        iqamah_asar: Number(form.iqamah_asar ?? 0),
        iqamah_maghrib: Number(form.iqamah_maghrib ?? 0),
        iqamah_isyak: Number(form.iqamah_isyak ?? 0),
        ticker_speed: Number(form.ticker_speed ?? 40),
        donation_goal: Number(form.donation_goal ?? 0),
        donation_current: Number(form.donation_current ?? 0),
      }});
      toast.success("Tetapan disimpan");
      refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ralat"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tetapan Masjid</h1>
        <p className="text-sm text-muted-foreground">Perubahan akan dipaparkan di skrin TV secara langsung.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label>Nama Masjid</Label>
          <Input value={String(form.mosque_name ?? "")} onChange={(e) => update("mosque_name", e.target.value)} />
        </div>

        <div className="col-span-2">
          <Label>Zon JAKIM</Label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(form.zone ?? "")}
            onChange={(e) => update("zone", e.target.value)}
          >
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
      </div>

      <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
    </div>
  );
}