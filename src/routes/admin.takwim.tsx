import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { updateIslamicEvent } from "@/lib/islamic-events.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useIslamicEventsAdmin } from "@/lib/display-data";

interface EventForm {
  date: string;
  date_confirmed: boolean;
  background_url: string;
  custom_text: string;
  hari_ini_message: string;
  is_active: boolean;
}

export const Route = createFileRoute("/admin/takwim")({
  component: TakwimPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

function TakwimPage() {
  const { data: islamicEvents, isLoading, refetch } = useIslamicEventsAdmin();

  const [eventForms, setEventForms] = useState<Record<string, EventForm>>({});
  const [eventSaving, setEventSaving] = useState<Record<string, boolean>>({});
  const [eventUploading, setEventUploading] = useState<Record<string, boolean>>({});
  const eventFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (islamicEvents) {
      setEventForms(
        Object.fromEntries(
          islamicEvents.map((e) => [
            e.id,
            {
              date: e.date,
              date_confirmed: e.date_confirmed,
              background_url: e.background_url,
              custom_text: e.custom_text,
              hari_ini_message: e.hari_ini_message,
              is_active: e.is_active,
            },
          ]),
        ),
      );
    }
  }, [islamicEvents]);

  const updateEventField = (id: string, k: keyof EventForm, v: EventForm[keyof EventForm]) => {
    setEventForms((f) => ({ ...f, [id]: { ...f[id], [k]: v } }));
  };

  const saveEvent = async (id: string) => {
    const ef = eventForms[id];
    if (!ef) return;
    setEventSaving((s) => ({ ...s, [id]: true }));
    try {
      await updateIslamicEvent(id, ef);
      toast.success("Acara disimpan");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat");
    } finally {
      setEventSaving((s) => ({ ...s, [id]: false }));
    }
  };

  const uploadEventBg = async (id: string, file: File) => {
    setEventUploading((u) => ({ ...u, [id]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      updateEventField(id, "background_url", url);
      toast.success("Gambar berjaya dimuat naik");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat muat naik");
    } finally {
      setEventUploading((u) => ({ ...u, [id]: false }));
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Memuatkan acara...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Takwim Islam</h1>
        <p className="text-sm text-muted-foreground">
          Slide acara Islam akan muncul secara automatik di TV. Kemaskini tarikh apabila ada pengumuman rasmi.
        </p>
      </div>

      <div className="space-y-4">
        {(islamicEvents ?? []).map((event) => {
          const ef = eventForms[event.id];
          if (!ef) return null;
          const isSaving = eventSaving[event.id] ?? false;
          const isUploading = eventUploading[event.id] ?? false;

          return (
            <div
              key={event.id}
              className={[
                "rounded-lg border p-4 space-y-3 transition-opacity",
                ef.is_active ? "border-input bg-surface-2" : "border-input/40 bg-surface-2/50 opacity-60",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{event.name}</h3>
                  <span className="text-xs text-gold">{event.hijri_label} H</span>
                  {event.is_subject_to_announcement && (
                    <span className={[
                      "text-xs px-2 py-0.5 rounded border",
                      ef.date_confirmed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                    ].join(" ")}>
                      {ef.date_confirmed ? "Tarikh Disahkan" : "Menunggu Pengumuman"}
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Aktif</span>
                  <input type="checkbox" checked={ef.is_active}
                    onChange={(e) => updateEventField(event.id, "is_active", e.target.checked)}
                    className="h-4 w-4 rounded" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={event.is_subject_to_announcement ? "" : "col-span-2"}>
                  <Label className="text-xs">Tarikh (YYYY-MM-DD)</Label>
                  <Input
                    type="date"
                    value={ef.date}
                    onChange={(e) => updateEventField(event.id, "date", e.target.value)}
                  />
                </div>
                {event.is_subject_to_announcement && (
                  <div className="flex items-end pb-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ef.date_confirmed}
                        onChange={(e) => updateEventField(event.id, "date_confirmed", e.target.checked)}
                        className="h-4 w-4 rounded" />
                      <span className="text-sm">Tarikh Disahkan Rasmi</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Teks Kiraan Hari (ditunjukkan semasa kira undur)</Label>
                <Input
                  value={ef.custom_text}
                  onChange={(e) => updateEventField(event.id, "custom_text", e.target.value)}
                  placeholder="cth: Ahlan wa Sahlan ya Ramadan"
                />
              </div>

              <div>
                <Label className="text-xs">Mesej Hari Ini (ditunjukkan pada hari acara)</Label>
                <Input
                  value={ef.hari_ini_message}
                  onChange={(e) => updateEventField(event.id, "hari_ini_message", e.target.value)}
                  placeholder="cth: Selamat Menyambut Awal Ramadan"
                />
              </div>

              <div>
                <Label className="text-xs">Gambar Latar Belakang</Label>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  {ef.background_url ? (
                    <div className="relative h-14 w-24 rounded overflow-hidden border border-input flex-shrink-0">
                      <img src={ef.background_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-14 w-24 rounded border border-input bg-background flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-muted-foreground">Lalai</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" variant="outline" size="sm" disabled={isUploading}
                      onClick={() => eventFileRefs.current[event.id]?.click()}>
                      {isUploading ? "Memuat naik..." : "Muat Naik Gambar"}
                    </Button>
                    {ef.background_url && (
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => updateEventField(event.id, "background_url", "")}>
                        Buang (guna latar lalai)
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">JPG / PNG · 1920×1080px · maks 5MB</p>
                  </div>
                  <input
                    ref={(el) => { eventFileRefs.current[event.id] = el; }}
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadEventBg(event.id, f);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              <Button size="sm" onClick={() => saveEvent(event.id)} disabled={isSaving}>
                {isSaving ? "Menyimpan..." : "Simpan Acara Ini"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
