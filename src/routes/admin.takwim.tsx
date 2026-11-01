import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { updateIslamicEvent, formatDateShort, formatHijriLabel } from "@/lib/islamic-events.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

type EventWithId = EventForm & { id: string };

export const Route = createFileRoute("/admin/takwim")({
  component: TakwimPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

const toForm = (e: EventForm): EventForm => ({
  date: e.date,
  date_confirmed: e.date_confirmed,
  background_url: e.background_url,
  custom_text: e.custom_text,
  hari_ini_message: e.hari_ini_message,
  duration_seconds: e.duration_seconds,
  is_active: e.is_active,
});

const sameForm = (a: EventForm, b: EventForm) =>
  a.date === b.date &&
  a.date_confirmed === b.date_confirmed &&
  a.background_url === b.background_url &&
  a.custom_text === b.custom_text &&
  a.hari_ini_message === b.hari_ini_message &&
  a.duration_seconds === b.duration_seconds &&
  a.is_active === b.is_active;

function TakwimPage() {
  const { data: islamicEvents, isLoading, refetch } = useIslamicEventsAdmin();

  const [drafts, setDrafts] = useState<Record<string, EventForm>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [eventSaving, setEventSaving] = useState<Record<string, boolean>>({});
  const [eventUploading, setEventUploading] = useState<Record<string, boolean>>({});
  const eventFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateField = (
    event: EventWithId,
    k: keyof EventForm,
    v: EventForm[keyof EventForm],
  ) => {
    setDrafts((d) => ({ ...d, [event.id]: { ...(d[event.id] ?? toForm(event)), [k]: v } }));
  };

  const saveEvent = async (id: string, ef: EventForm) => {
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
      await refetch();
      setDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      toast.success("Event saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setEventSaving((s) => ({ ...s, [id]: false }));
    }
  };

  const uploadEventBg = async (event: EventWithId, file: File) => {
    setEventUploading((u) => ({ ...u, [event.id]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      updateField(event, "background_url", url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload error");
    } finally {
      setEventUploading((u) => ({ ...u, [event.id]: false }));
    }
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading events...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Islamic Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Islamic event slides appear automatically on the TV. Update the date when an official announcement is made.
          Tap an event to edit it.
        </p>
      </div>

      <div className="space-y-3">
        {(islamicEvents ?? []).map((event) => {
          const ef = drafts[event.id] ?? toForm(event);
          const dirty = !sameForm(ef, toForm(event));
          const isOpen = openId === event.id;
          const isSaving = eventSaving[event.id] ?? false;
          const isUploading = eventUploading[event.id] ?? false;

          return (
            <div
              key={event.id}
              className={[
                "overflow-hidden rounded-lg border",
                ef.is_active ? "border-input bg-surface-2" : "border-input/40 bg-surface-2/50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : event.id)}
                className={[
                  "flex w-full items-center justify-between gap-3 p-4 text-left",
                  ef.is_active ? "" : "opacity-60",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{event.name}</h3>
                    {dirty && (
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-400">
                        Unsaved
                      </span>
                    )}
                    {!ef.is_active && (
                      <span className="rounded border border-input px-2 py-0.5 text-xs text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-gold">{formatHijriLabel(event, ef.date)}</span>
                    <span className="text-muted-foreground">{formatDateShort(ef.date)}</span>
                    {event.is_subject_to_announcement && (
                      <span
                        className={[
                          "rounded border px-2 py-0.5",
                          ef.date_confirmed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                        ].join(" ")}
                      >
                        {ef.date_confirmed ? "Date Confirmed" : "Awaiting Announcement"}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={[
                    "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform",
                    isOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-input p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm">Active (show this event on the TV)</Label>
                    <Switch
                      checked={ef.is_active}
                      onCheckedChange={(v) => updateField(event, "is_active", v)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Date (DD-MMM-YYYY)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="date"
                          className="min-w-0 flex-1"
                          value={ef.date}
                          onChange={(e) => updateField(event, "date", e.target.value)}
                        />
                        <span className="whitespace-nowrap text-sm font-semibold text-gold">
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
                        onChange={(e) => updateField(event, "duration_seconds", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {event.is_subject_to_announcement && (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={ef.date_confirmed}
                        onChange={(e) => updateField(event, "date_confirmed", e.target.checked)}
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-sm">Date Officially Confirmed</span>
                    </label>
                  )}

                  <div>
                    <Label className="text-xs">Countdown Text (shown during the countdown)</Label>
                    <Input
                      value={ef.custom_text}
                      onChange={(e) => updateField(event, "custom_text", e.target.value)}
                      placeholder="e.g. Ahlan wa Sahlan ya Ramadan"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Event Day Message (shown on the day of the event)</Label>
                    <Input
                      value={ef.hari_ini_message}
                      onChange={(e) => updateField(event, "hari_ini_message", e.target.value)}
                      placeholder="e.g. Selamat Menyambut Awal Ramadan"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Background Image</Label>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {ef.background_url ? (
                        <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded border border-input">
                          <img src={ef.background_url} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-24 flex-shrink-0 items-center justify-center rounded border border-input bg-background">
                          <span className="text-xs text-muted-foreground">Default</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploading}
                          onClick={() => eventFileRefs.current[event.id]?.click()}
                        >
                          {isUploading ? "Uploading..." : "Upload Image"}
                        </Button>
                        {ef.background_url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateField(event, "background_url", "")}
                          >
                            Remove (use default background)
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">JPG / PNG · 1920×1080px · max 5MB</p>
                      </div>
                      <input
                        ref={(el) => {
                          eventFileRefs.current[event.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadEventBg(event, f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => saveEvent(event.id, ef)}
                    disabled={isSaving || !dirty}
                  >
                    {isSaving ? "Saving..." : "Save This Event"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
