import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useKuliahAdmin } from "@/lib/display-data";
import {
  addKuliah,
  deleteKuliah,
  updateKuliah,
  type KuliahInput,
  type KuliahRow,
} from "@/lib/kuliah.functions";
import { formatDateShort, klToday } from "@/lib/islamic-events.functions";

export const Route = createFileRoute("/admin/kuliah")({
  component: KuliahPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

const SECTION_TITLE = "text-sm font-semibold uppercase tracking-wider text-gold";

type UploadTarget = "background" | "photo";

const EMPTY_FORM: KuliahInput = {
  title: "",
  speaker: "",
  speaker_photo_url: "",
  date: "",
  time_text: "",
  background_url: "",
  duration_seconds: 20,
  is_active: true,
};

const toForm = (k: KuliahRow): KuliahInput => ({
  title: k.title,
  speaker: k.speaker,
  speaker_photo_url: k.speaker_photo_url,
  date: k.date,
  time_text: k.time_text,
  background_url: k.background_url,
  duration_seconds: k.duration_seconds,
  is_active: k.is_active,
});

const sameForm = (a: KuliahInput, b: KuliahInput) =>
  a.title === b.title &&
  a.speaker === b.speaker &&
  a.speaker_photo_url === b.speaker_photo_url &&
  a.date === b.date &&
  a.time_text === b.time_text &&
  a.background_url === b.background_url &&
  a.duration_seconds === b.duration_seconds &&
  a.is_active === b.is_active;

function validate(f: KuliahInput): string | null {
  if (!f.title.trim()) return "Title is required";
  if (!f.date) return "Choose a date";
  if (!Number.isInteger(f.duration_seconds) || f.duration_seconds < 5 || f.duration_seconds > 300) {
    return "Slide duration must be a whole number from 5 to 300 seconds";
  }
  return null;
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const { url } = await res.json();
  return url;
}

function KuliahFields({
  form,
  onChange,
  showActive,
}: {
  form: KuliahInput;
  onChange: (patch: Partial<KuliahInput>) => void;
  showActive: boolean;
}) {
  const bgRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState<UploadTarget | null>(null);

  const handleFile = async (file: File, target: UploadTarget) => {
    setUploading(target);
    try {
      const url = await uploadImage(file);
      if (target === "photo") onChange({ speaker_photo_url: url });
      else onChange({ background_url: url });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload error");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-3">
      {showActive && (
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">Active (show this kuliah on the TV)</Label>
          <Switch checked={form.is_active} onCheckedChange={(v) => onChange({ is_active: v })} />
        </div>
      )}

      <div>
        <Label className="text-xs">Title</Label>
        <Input
          value={form.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Kuliah Tafsir Surah Al-Kahfi"
        />
      </div>

      <div>
        <Label className="text-xs">Speaker (optional)</Label>
        <Input
          value={form.speaker}
          onChange={(e) => onChange({ speaker: e.target.value })}
          placeholder="e.g. Ustaz Ahmad bin Ali"
        />
      </div>

      <div>
        <Label className="text-xs">Speaker Photo (optional)</Label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {form.speaker_photo_url ? (
            <img
              src={form.speaker_photo_url}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-full border border-input object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border border-input bg-background">
              <span className="text-xs text-muted-foreground">None</span>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading === "photo"}
              onClick={() => photoRef.current?.click()}
            >
              {uploading === "photo" ? "Uploading..." : "Upload Photo"}
            </Button>
            {form.speaker_photo_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ speaker_photo_url: "" })}
              >
                Remove photo
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Square photo works best · JPG / PNG · max 5MB</p>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "photo");
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Date (DD-MMM-YYYY)</Label>
          <div className="flex items-center gap-3">
            <Input
              type="date"
              className="min-w-0 flex-1"
              value={form.date}
              onChange={(e) => onChange({ date: e.target.value })}
            />
            <span className="whitespace-nowrap text-sm font-semibold text-gold">
              {formatDateShort(form.date)}
            </span>
          </div>
        </div>
        <div>
          <Label className="text-xs">Time (optional, shown as typed)</Label>
          <Input
            value={form.time_text}
            onChange={(e) => onChange({ time_text: e.target.value })}
            placeholder="e.g. Selepas Maghrib"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Slide Duration (seconds, 5 to 300)</Label>
        <Input
          type="number"
          min={5}
          max={300}
          value={form.duration_seconds}
          onChange={(e) => onChange({ duration_seconds: Number(e.target.value) })}
        />
      </div>

      <div>
        <Label className="text-xs">Background Image</Label>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {form.background_url ? (
            <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded border border-input">
              <img src={form.background_url} alt="" className="h-full w-full object-cover" />
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
              disabled={uploading === "background"}
              onClick={() => bgRef.current?.click()}
            >
              {uploading === "background" ? "Uploading..." : "Upload Image"}
            </Button>
            {form.background_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ background_url: "" })}
              >
                Remove (use default background)
              </Button>
            )}
            <p className="text-xs text-muted-foreground">JPG / PNG · 1920×1080px · max 5MB</p>
          </div>
          <input
            ref={bgRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "background");
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function KuliahPage() {
  const { data, isLoading, refetch } = useKuliahAdmin();
  const [newForm, setNewForm] = useState<KuliahInput>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, KuliahInput>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showPassed, setShowPassed] = useState(false);

  const today = klToday();
  const rows = data ?? [];
  const visibleRows = rows.filter((r) => showPassed || r.date >= today);
  const passedCount = rows.filter((r) => r.date < today).length;
  const onTvCount = rows.filter((r) => r.is_active && r.date >= today).length;

  const handleAdd = async () => {
    const err = validate(newForm);
    if (err) {
      toast.error(err);
      return;
    }
    setAdding(true);
    try {
      await addKuliah({ ...newForm, title: newForm.title.trim(), speaker: newForm.speaker.trim() });
      toast.success("Kuliah added");
      setNewForm(EMPTY_FORM);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setAdding(false);
    }
  };

  const updateDraft = (row: KuliahRow, patch: Partial<KuliahInput>) => {
    setDrafts((d) => ({ ...d, [row.id]: { ...(d[row.id] ?? toForm(row)), ...patch } }));
  };

  const handleSave = async (id: string, form: KuliahInput) => {
    const err = validate(form);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await updateKuliah(id, { ...form, title: form.title.trim(), speaker: form.speaker.trim() });
      await refetch();
      setDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      toast.success("Kuliah saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  const handleDelete = async (row: KuliahRow) => {
    if (!window.confirm(`Delete "${row.title}" on ${formatDateShort(row.date)}?`)) return;
    try {
      await deleteKuliah(row.id);
      toast.success("Kuliah deleted");
      setOpenId(null);
      setDrafts((d) => {
        const next = { ...d };
        delete next[row.id];
        return next;
      });
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading kuliah...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Kuliah</h1>
        <p className="text-sm text-muted-foreground">
          Every active kuliah with a date of today or later plays on the TV, one after another,
          right before the Islamic calendar slides. Today's kuliah is hidden once the Isyak black
          screen has ended. With no kuliah to show, nothing plays.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Add Kuliah</h2>
        <div className="space-y-4 rounded-lg border border-input bg-surface-2 p-4">
          <KuliahFields
            form={newForm}
            onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))}
            showActive={false}
          />
          <Button className="w-full sm:w-auto" onClick={handleAdd} disabled={adding}>
            {adding ? "Adding..." : "Add Kuliah"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={SECTION_TITLE}>Scheduled Kuliah</h2>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">{onTvCount} on the TV rotation</span>
          {passedCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={showPassed}
                onChange={(e) => setShowPassed(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Show passed ({passedCount})
            </label>
          )}
        </div>

        {visibleRows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No kuliah scheduled. The TV shows nothing for kuliah.
          </p>
        )}

        {visibleRows.map((row) => {
          const form = drafts[row.id] ?? toForm(row);
          const dirty = !sameForm(form, toForm(row));
          const isOpen = openId === row.id;
          const isSaving = saving[row.id] ?? false;
          const passed = row.date < today;

          return (
            <div
              key={row.id}
              className={[
                "overflow-hidden rounded-lg border",
                row.is_active && !passed ? "border-input bg-surface-2" : "border-input/40 bg-surface-2/50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : row.id)}
                className={[
                  "flex w-full items-center justify-between gap-3 p-4 text-left",
                  row.is_active && !passed ? "" : "opacity-60",
                ].join(" ")}
              >
                {row.speaker_photo_url && (
                  <img
                    src={row.speaker_photo_url}
                    alt=""
                    className="h-12 w-12 flex-shrink-0 rounded-full border border-input object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{row.title}</h3>
                    {dirty && (
                      <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-400">
                        Unsaved
                      </span>
                    )}
                    {passed ? (
                      <span className="rounded border border-input px-2 py-0.5 text-xs text-muted-foreground">
                        Passed
                      </span>
                    ) : !row.is_active ? (
                      <span className="rounded border border-input px-2 py-0.5 text-xs text-muted-foreground">
                        Inactive
                      </span>
                    ) : (
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        On TV
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-semibold text-gold">{formatDateShort(row.date)}</span>
                    {row.time_text && <span className="text-muted-foreground">{row.time_text}</span>}
                    {row.speaker && <span className="text-muted-foreground">{row.speaker}</span>}
                    <span className="text-muted-foreground">{row.duration_seconds}s</span>
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
                <div className="space-y-4 border-t border-input p-4">
                  <KuliahFields
                    form={form}
                    onChange={(patch) => updateDraft(row, patch)}
                    showActive
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => handleSave(row.id, form)}
                      disabled={isSaving || !dirty}
                    >
                      {isSaving ? "Saving..." : "Save This Kuliah"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
