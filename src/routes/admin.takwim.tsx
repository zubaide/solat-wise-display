import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { updateIslamicEvent, formatDateShort, formatHijriLabel } from "@/lib/islamic-events.functions";
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
  duration_seconds: number;
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
              duration_seconds: e.duration_seconds,
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
    if (!ef.date) {
      toast.error("Please choose a date");
      return;
    }
    if (!Number.isInteger(ef.duration_seconds) || ef.duration_seconds < 5 || ef.duration_seconds > 300) {
      toast.error("Slide duration must be a whole number from 5 to 300 seconds");
      return;
    }
    setEventSaving((s) => ({ ...s, [id]: true }));
    try {
      await updateIslamicEvent(id, ef);
      toast.success("Event saved");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
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
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload error");
    } finally {
      setEventUploading((u) => ({ ...u, [id]: false }));
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading events...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Islamic Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Islamic event slides appear automatically on the TV. Update the date when an official announcement is made.
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
                  <span className="text-xs text-gold">{formatHijriLabel(event, ef.date)}</span>
                  {event.is_subject_to_announcement && (
                    <span className={[
                      "text-xs px-2 py-0.5 rounded border",
                      ef.date_confirmed
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                    ].join(" ")}>
                      {ef.date_confirmed ? "Date Confirmed" : "Awaiting Announcement"}
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Active</span>
                  <input type="checkbox" checked={ef.is_active}
                    onChange={(e) => updateEventField(event.id, "is_active", e.target.checked)}
                    className="h-4 w-4 rounded" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date (DD-MMM-YYYY)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="date"
                      className="min-w-0 flex-1"
                      value={ef.date}
                      onChange={(e) => updateEventField(event.id, "date", e.target.value)}
                    />
                    <span className="text-sm font-semibold text-gold whitespace-nowrap">
                      {formatDateShort(ef.date)}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Slide Duration (seconds, 5 to 300)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={ef.duration_seconds}
                    onChange={(e) => updateEventField(event.id, "duration_seconds", Number(e.target.value))}
                  />
                </div>
              </div>

              {event.is_subject_to_announcement && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ef.date_confirmed}
                    onChange={(e) => updateEventField(event.id, "date_confirmed", e.target.checked)}
                    className="h-4 w-4 rounded" />
                  <span className="text-sm">Date Officially Confirmed</span>
                </label>
              )}

              <div>
                <Label className="text-xs">Countdown Text (shown during the countdown)</Label>
                <Input
                  value={ef.custom_text}
                  onChange={(e) => updateEventField(event.id, "custom_text", e.target.value)}
                  placeholder="e.g. Ahlan wa Sahlan ya Ramadan"
                />
              </div>

              <div>
                <Label className="text-xs">Event Day Message (shown on the day of the event)</Label>
                <Input
                  value={ef.hari_ini_message}
                  onChange={(e) => updateEventField(event.id, "hari_ini_message", e.target.value)}
                  placeholder="e.g. Selamat Menyambut Awal Ramadan"
                />
              </div>

              <div>
                <Label className="text-xs">Background Image</Label>
                <div className="mt-1 flex items-center gap-3 flex-wrap">
                  {ef.background_url ? (
                    <div className="relative h-14 w-24 rounded overflow-hidden border border-input flex-shrink-0">
                      <img src={ef.background_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-14 w-24 rounded border border-input bg-background flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-muted-foreground">Default</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Button type="button" variant="outline" size="sm" disabled={isUploading}
                      onClick={() => eventFileRefs.current[event.id]?.click()}>
                      {isUploading ? "Uploading..." : "Upload Image"}
                    </Button>
                    {ef.background_url && (
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => updateEventField(event.id, "background_url", "")}>
                        Remove (use default background)
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">JPG / PNG · 1920×1080px · max 5MB</p>
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
                {isSaving ? "Saving..." : "Save This Event"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
