import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  addIslamicEventDate,
  deleteIslamicEventDate,
  formatDateShort,
  formatHijriLabel,
  klToday,
  setIslamicEventDateConfirmed,
  updateIslamicEvent,
  type IslamicEventDateRow,
} from "@/lib/islamic-events.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useIslamicEventDatesAdmin, useIslamicEventsAdmin } from "@/lib/display-data";

interface EventForm {
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

const SELECT_CLASS = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const SECTION_TITLE = "text-sm font-semibold uppercase tracking-wider text-gold";

const toForm = (e: EventForm): EventForm => ({
  background_url: e.background_url,
  custom_text: e.custom_text,
  hari_ini_message: e.hari_ini_message,
  duration_seconds: e.duration_seconds,
  is_active: e.is_active,
});

const sameForm = (a: EventForm, b: EventForm) =>
  a.background_url === b.background_url &&
  a.custom_text === b.custom_text &&
  a.hari_ini_message === b.hari_ini_message &&
  a.duration_seconds === b.duration_seconds &&
  a.is_active === b.is_active;

function TakwimPage() {
  const { data: islamicEvents, isLoading, refetch } = useIslamicEventsAdmin();
  const { data: datesData, refetch: refetchDates } = useIslamicEventDatesAdmin();

  const [drafts, setDrafts] = useState<Record<string, EventForm>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [eventSaving, setEventSaving] = useState<Record<string, boolean>>({});
  const [eventUploading, setEventUploading] = useState<Record<string, boolean>>({});
  const eventFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [newEventId, setNewEventId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newConfirmed, setNewConfirmed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filterEventId, setFilterEventId] = useState("");
  const [showPassed, setShowPassed] = useState(false);

  const today = klToday();
  const events = islamicEvents ?? [];
  const eventById = new Map(events.map((e) => [e.id, e]));
  const dates = datesData?.dates ?? [];
  const win = datesData?.window;
  const lastEvent = events.length ? events[events.length - 1] : null;
  const selectedEventId = newEventId || events[0]?.id || "";
  const selectedEvent = eventById.get(selectedEventId);

  const onTvIds = new Set<string>();
  if (win?.showing && win.end) {
    const seen = new Set<string>();
    for (const row of dates) {
      if (row.date < today || row.date > win.end || seen.has(row.event_id)) continue;
      seen.add(row.event_id);
      if (eventById.get(row.event_id)?.is_active) onTvIds.add(row.id);
    }
  }

  const visibleDates = dates.filter(
    (r) => (showPassed || r.date >= today) && (!filterEventId || r.event_id === filterEventId),
  );

  const nextSetMissing =
    !!win?.showing &&
    !!win.end &&
    !!lastEvent &&
    !dates.some((r) => r.event_id === lastEvent.id && r.date > win.end!);

  const reloadAll = () => Promise.all([refetch(), refetchDates()]);

  const handleAdd = async () => {
    if (!selectedEventId || !newDate) {
      toast.error("Choose an event and a date");
      return;
    }
    setAdding(true);
    try {
      await addIslamicEventDate({
        event_id: selectedEventId,
        date: newDate,
        date_confirmed: selectedEvent?.is_subject_to_announcement ? newConfirmed : false,
      });
      toast.success("Date added");
      setNewDate("");
      await reloadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setAdding(false);
    }
  };

  const toggleConfirmed = async (row: IslamicEventDateRow, value: boolean) => {
    try {
      await setIslamicEventDateConfirmed(row.id, value);
      await reloadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const removeDate = async (row: IslamicEventDateRow) => {
    const name = eventById.get(row.event_id)?.name ?? "this event";
    if (!window.confirm(`Delete ${formatDateShort(row.date)} for ${name}?`)) return;
    try {
      await deleteIslamicEventDate(row.id);
      toast.success("Date deleted");
      await reloadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const updateField = (
    event: EventWithId,
    k: keyof EventForm,
    v: EventForm[keyof EventForm],
  ) => {
    setDrafts((d) => ({ ...d, [event.id]: { ...(d[event.id] ?? toForm(event)), [k]: v } }));
  };

  const saveEvent = async (id: string, ef: EventForm) => {
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

  const lastName = lastEvent?.name ?? "the last event";

  const rowBadge = (row: IslamicEventDateRow) => {
    if (row.date < today) {
      return { text: "Passed", cls: "border-input text-muted-foreground" };
    }
    if (onTvIds.has(row.id)) {
      return { text: "On TV", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" };
    }
    return { text: "Scheduled", cls: "border-input text-muted-foreground" };
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Islamic Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Add the dates for each event below. The TV shows one yearly set at a time. The next set
          starts one month after the {lastName} date.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className={SECTION_TITLE}>Event Dates</h2>

        {win && (
          <div className="space-y-2 text-sm">
            {win.showing && win.end ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
                The TV is showing the current set. It ends on {formatDateShort(win.end)}.
              </p>
            ) : win.end && win.starts_on ? (
              <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-400">
                The next set starts on {formatDateShort(win.starts_on)}. The TV shows no Islamic events until then.
              </p>
            ) : (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-400">
                No upcoming {lastName} date in the table. The TV shows no Islamic events until you add one.
              </p>
            )}
            {nextSetMissing && win.end && (
              <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-yellow-400">
                The set after this one has no {lastName} date yet. Add it before {formatDateShort(win.end)} so
                the TV does not go blank.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-input bg-surface-2 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Event</Label>
              <select
                className={SELECT_CLASS}
                value={selectedEventId}
                onChange={(e) => setNewEventId(e.target.value)}
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Date (DD-MMM-YYYY)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  className="min-w-0 flex-1"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                />
                <span className="whitespace-nowrap text-sm font-semibold text-gold">
                  {formatDateShort(newDate)}
                </span>
              </div>
            </div>
          </div>
          {selectedEvent?.is_subject_to_announcement && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={newConfirmed}
                onChange={(e) => setNewConfirmed(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm">Date officially confirmed</span>
            </label>
          )}
          <Button className="w-full sm:w-auto" onClick={handleAdd} disabled={adding}>
            {adding ? "Adding..." : "Add Date"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className={`${SELECT_CLASS} sm:w-64`}
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
          >
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showPassed}
              onChange={(e) => setShowPassed(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Show passed dates
          </label>
          <span className="text-xs text-muted-foreground">
            {visibleDates.length} of {dates.length} dates
          </span>
        </div>

        <div className="max-h-[28rem] space-y-2 overflow-y-auto">
          {visibleDates.length === 0 && (
            <p className="text-sm text-muted-foreground">No dates to show.</p>
          )}
          {visibleDates.map((row) => {
            const event = eventById.get(row.event_id);
            if (!event) return null;
            const badge = rowBadge(row);
            return (
              <div
                key={row.id}
                className={[
                  "flex flex-wrap items-center justify-between gap-3 rounded-md border border-input bg-surface-2 p-3",
                  row.date < today ? "opacity-60" : "",
                ].join(" ")}
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gold">{formatDateShort(row.date)}</span>
                    <span className={["rounded border px-2 py-0.5 text-xs", badge.cls].join(" ")}>
                      {badge.text}
                    </span>
                  </div>
                  <p className="text-sm">{event.name}</p>
                  <p className="text-xs text-muted-foreground">{formatHijriLabel(event, row.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {event.is_subject_to_announcement && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={row.date_confirmed}
                        onCheckedChange={(v) => toggleConfirmed(row, v)}
                      />
                      Confirmed
                    </label>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => removeDate(row)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Event Slides</h2>
        <p className="text-xs text-muted-foreground">
          Tap an event to edit its slide. Dates are managed in the table above.
        </p>

        {events.map((event) => {
          const ef = drafts[event.id] ?? toForm(event);
          const dirty = !sameForm(ef, toForm(event));
          const isOpen = openId === event.id;
          const isSaving = eventSaving[event.id] ?? false;
          const isUploading = eventUploading[event.id] ?? false;
          const noDate = !event.date;
          const passed = !noDate && event.date < today;

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
                    <span className="text-gold">{formatHijriLabel(event, event.date)}</span>
                    {noDate ? (
                      <span className="text-yellow-400">No date in the table</span>
                    ) : (
                      <span className="text-muted-foreground">{formatDateShort(event.date)}</span>
                    )}
                    {passed && (
                      <span className="rounded border border-input px-2 py-0.5 text-muted-foreground">
                        Passed
                      </span>
                    )}
                    {event.is_subject_to_announcement && !noDate && (
                      <span
                        className={[
                          "rounded border px-2 py-0.5",
                          event.date_confirmed
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
                        ].join(" ")}
                      >
                        {event.date_confirmed ? "Date Confirmed" : "Awaiting Announcement"}
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
      </section>
    </div>
  );
}
