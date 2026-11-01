import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSlideshow } from "@/lib/display-data";
import {
  addSlide,
  updateSlide,
  deleteSlide,
  lookupQuran,
  type SlidePatch,
  type SlideRow,
  type SlideType,
} from "@/lib/slideshow.functions";
import { SURAHS, surahName, surahAyat } from "@/lib/surahs";
import { TextSlide, type TextSlideData } from "@/components/display/TextSlide";
import { QuranFontFace, QURAN_FONT_FAMILY } from "@/components/display/QuranFontFace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/slideshow")({
  component: SlideshowPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

const TEXTAREA_CLASS = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const SELECT_CLASS = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const SIZE_STEP = 10;
const SIZE_MIN = 30;
const SIZE_MAX = 400;

interface TextFormValues {
  title: string;
  arabic_text: string;
  quran_ref: string;
  translation: string;
  title_size: number;
  arabic_size: number;
  translation_size: number;
  image_url: string;
}

const EMPTY_TEXT: TextFormValues = {
  title: "",
  arabic_text: "",
  quran_ref: "",
  translation: "",
  title_size: 100,
  arabic_size: 100,
  translation_size: 100,
  image_url: "",
};

const fromSlide = (s: SlideRow): TextFormValues => ({
  title: s.title,
  arabic_text: s.arabic_text,
  quran_ref: s.quran_ref,
  translation: s.translation,
  title_size: s.title_size,
  arabic_size: s.arabic_size,
  translation_size: s.translation_size,
  image_url: s.image_url,
});

const hasText = (v: TextFormValues) =>
  !!(v.title.trim() || v.arabic_text.trim() || v.translation.trim());

const textPayload = (v: TextFormValues) => ({
  image_url: v.image_url.trim(),
  title: v.title.trim(),
  arabic_text: v.arabic_text.trim(),
  quran_ref: v.quran_ref,
  translation: v.translation.trim(),
  title_size: v.title_size,
  arabic_size: v.arabic_size,
  translation_size: v.translation_size,
});

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.floor(v) || lo));

function parseRef(input: string) {
  const m = input.trim().match(/^(\d{1,3}):(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
  if (!m) return null;
  const from = Number(m[2]);
  return { surah: Number(m[1]), from, to: m[3] ? Number(m[3]) : from };
}

function refLabel(ref: string) {
  const p = parseRef(ref);
  return p ? `${surahName(p.surah)} ${ref}` : ref;
}

function slideLabel(s: SlideRow) {
  return s.title || s.translation || s.quran_ref || "(text slide)";
}

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) {
    toast.error("Upload failed");
    return null;
  }
  const j = (await res.json()) as { url: string };
  return j.url;
}

function SizeControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.min(SIZE_MAX, Math.max(SIZE_MIN, v)));
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => set(value - SIZE_STEP)}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-12 text-center text-xs tabular-nums">{value}%</span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => set(value + SIZE_STEP)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SizeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs">{label}</Label>
      <SizeControl value={value} onChange={onChange} />
    </div>
  );
}

function PreviewBox({ slide }: { slide: TextSlideData }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
      <TextSlide slide={slide} />
    </div>
  );
}

function TextFields({
  values,
  onChange,
}: {
  values: TextFormValues;
  onChange: (v: TextFormValues) => void;
}) {
  const parsed = parseRef(values.quran_ref);
  const [surah, setSurah] = useState(parsed?.surah ?? 1);
  const [from, setFrom] = useState(parsed?.from ?? 1);
  const [to, setTo] = useState(parsed?.to ?? 1);
  const [fetched, setFetched] = useState<{ text: string; ref: string } | null>(
    values.quran_ref && values.arabic_text
      ? { text: values.arabic_text, ref: values.quran_ref }
      : null,
  );
  const maxAyat = surahAyat(surah);

  const set = (patch: Partial<TextFormValues>) => onChange({ ...values, ...patch });

  const changeSurah = (n: number) => {
    setSurah(n);
    setFrom(1);
    setTo(1);
  };

  const fetchQuran = async () => {
    const f = clamp(from, 1, maxAyat);
    const t = clamp(to, f, maxAyat);
    setFrom(f);
    setTo(t);
    try {
      const res = await lookupQuran({ data: { surah, from: f, to: t } });
      setFetched(res);
      set({ arabic_text: res.text, quran_ref: res.ref });
      toast.success("Tanzil text loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const onArabicChange = (v: string) =>
    set({ arabic_text: v, quran_ref: fetched && v === fetched.text ? fetched.ref : "" });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SizeRow
          label="Line 1 · Title"
          value={values.title_size}
          onChange={(v) => set({ title_size: v })}
        />
        <Input
          placeholder="e.g. Daily Dua"
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <SizeRow
          label="Line 2 · Quran"
          value={values.arabic_size}
          onChange={(v) => set({ arabic_size: v })}
        />
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Label className="text-xs">Surah</Label>
            <select
              className={SELECT_CLASS}
              value={surah}
              onChange={(e) => changeSurah(Number(e.target.value))}
            >
              {SURAHS.map(([name, count], i) => (
                <option key={name} value={i + 1}>
                  {`${i + 1}. ${name} (${count} verses)`}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <Label className="text-xs">From verse</Label>
            <Input
              type="number"
              min={1}
              max={maxAyat}
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
            />
          </div>
          <div className="w-24">
            <Label className="text-xs">To verse</Label>
            <Input
              type="number"
              min={1}
              max={maxAyat}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
            />
          </div>
          <Button type="button" variant="secondary" onClick={fetchQuran}>
            Fetch from Tanzil
          </Button>
        </div>
        <textarea
          dir="rtl"
          lang="ar"
          rows={4}
          className={TEXTAREA_CLASS}
          style={{ fontFamily: QURAN_FONT_FAMILY, fontSize: "1.5rem", lineHeight: 1.9 }}
          value={values.arabic_text}
          onChange={(e) => onArabicChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {values.quran_ref && <>Reference: {refLabel(values.quran_ref)}. </>}
          Maximum 10 verses per fetch. Text source:{" "}
          <a href="https://tanzil.net" target="_blank" rel="noreferrer" className="underline">
            Tanzil Project (tanzil.net)
          </a>
          . If pasting manually, paste only from a trusted source.
        </p>
      </div>

      <div className="space-y-2">
        <SizeRow
          label="Line 3 · Translation"
          value={values.translation_size}
          onChange={(v) => set({ translation_size: v })}
        />
        <textarea
          rows={3}
          className={TEXTAREA_CLASS}
          placeholder="Translation (Malay or English)"
          value={values.translation}
          onChange={(e) => set({ translation: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Background (optional — empty = dark blue)</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const u = await uploadImage(f);
            if (u) {
              set({ image_url: u });
              toast.success("Background uploaded");
            }
          }}
        />
        {values.image_url && (
          <Button type="button" size="sm" variant="ghost" onClick={() => set({ image_url: "" })}>
            Remove background
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Preview</Label>
        <PreviewBox slide={values} />
      </div>
    </div>
  );
}

function SlideshowPage() {
  const { data, refetch, isLoading } = useSlideshow(false);
  const [slideType, setSlideType] = useState<SlideType>("photo");
  const [interval, setIntervalSec] = useState(8);
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const [textValues, setTextValues] = useState<TextFormValues>(EMPTY_TEXT);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<{ id: string; values: TextFormValues } | null>(null);

  const add = async () => {
    try {
      if (slideType === "photo") {
        const imageUrl = url.trim();
        if (!imageUrl) return;
        await addSlide({
          data: {
            slide_type: "photo",
            image_url: imageUrl,
            caption: caption.trim() || null,
            interval_seconds: Math.max(2, Number(interval) || 8),
            show_header: showHeader,
            show_footer: showFooter,
          },
        });
        setUrl("");
        setCaption("");
      } else {
        if (!hasText(textValues)) {
          toast.error("Fill in at least one line");
          return;
        }
        await addSlide({
          data: {
            slide_type: "text",
            ...textPayload(textValues),
            interval_seconds: Math.max(2, Number(interval) || 8),
            show_header: showHeader,
            show_footer: showFooter,
          },
        });
        setTextValues(EMPTY_TEXT);
        setFormKey((k) => k + 1);
      }
      toast.success("Slide added");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!hasText(editing.values)) {
      toast.error("Fill in at least one line");
      return;
    }
    try {
      await updateSlide({ data: { id: editing.id, ...textPayload(editing.values) } });
      setEditing(null);
      toast.success("Slide updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const toggle = async (id: string, is_active: boolean) => {
    await updateSlide({ data: { id, is_active } });
    refetch();
  };

  const updateField = async (id: string, patch: SlidePatch) => {
    try {
      await updateSlide({ data: { id, ...patch } });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const remove = async (id: string) => {
    await deleteSlide({ data: { id } });
    if (editing?.id === id) setEditing(null);
    refetch();
  };

  return (
    <>
      <QuranFontFace />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Display Slides</h1>
          <p className="text-sm text-muted-foreground">
            Active slides rotate as the TV background. A slide can be a photo or a text slide
            (dua / hadith). Set the duration of each slide, and whether the header (mosque name) or
            footer (clock &amp; announcements) is shown during it.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-surface-2/40 p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={slideType === "photo" ? "default" : "outline"}
              onClick={() => setSlideType("photo")}
            >
              Photo
            </Button>
            <Button
              type="button"
              variant={slideType === "text" ? "default" : "outline"}
              onClick={() => setSlideType("text")}
            >
              Text (Dua / Hadith)
            </Button>
          </div>

          {slideType === "photo" ? (
            <>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const u = await uploadImage(f);
                  if (u) {
                    setUrl(u);
                    toast.success("Image uploaded — press Add Slide");
                  }
                }}
              />
              <Input
                placeholder="or image URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Input
                placeholder="Caption (optional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </>
          ) : (
            <TextFields key={formKey} values={textValues} onChange={setTextValues} />
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Duration (seconds)</Label>
              <Input
                type="number"
                min={2}
                value={interval}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={showHeader} onCheckedChange={setShowHeader} />
              <Label className="text-xs">Show Header</Label>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={showFooter} onCheckedChange={setShowFooter} />
              <Label className="text-xs">Show Footer</Label>
            </div>
          </div>
          <Button onClick={add}>Add Slide</Button>
        </div>

        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {data?.map((s) => {
              const isEditing = editing?.id === s.id;
              return (
                <div
                  key={s.id}
                  className={[
                    "overflow-hidden rounded-lg border border-border bg-surface-2/40",
                    isEditing ? "col-span-2" : "",
                  ].join(" ")}
                >
                  {isEditing && editing ? (
                    <div className="space-y-3 p-3">
                      <TextFields
                        key={editing.id}
                        values={editing.values}
                        onChange={(v) => setEditing({ id: editing.id, values: v })}
                      />
                      <div className="flex gap-2">
                        <Button onClick={saveEdit}>Save</Button>
                        <Button variant="outline" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {s.slide_type === "text" ? (
                        <PreviewBox slide={s} />
                      ) : (
                        <img
                          src={s.image_url}
                          alt={s.caption ?? ""}
                          className="h-40 w-full object-cover"
                        />
                      )}
                      <div className="space-y-2 p-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
                          {s.slide_type === "text" ? (
                            <span className="flex-1 truncate text-sm">{slideLabel(s)}</span>
                          ) : (
                            <Input
                              defaultValue={s.caption ?? ""}
                              placeholder="Caption (optional)"
                              className="h-8 flex-1 text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v !== (s.caption ?? "")) {
                                  void updateField(s.id, { caption: v || null });
                                }
                              }}
                            />
                          )}
                          {s.slide_type === "text" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditing({ id: s.id, values: fromSlide(s) })}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {s.slide_type === "text" && (
                          <div className="space-y-2">
                            {s.title && (
                              <SizeRow
                                label="Title size"
                                value={s.title_size}
                                onChange={(v) => updateField(s.id, { title_size: v })}
                              />
                            )}
                            {s.arabic_text && (
                              <SizeRow
                                label="Quran size"
                                value={s.arabic_size}
                                onChange={(v) => updateField(s.id, { arabic_size: v })}
                              />
                            )}
                            {s.translation && (
                              <SizeRow
                                label="Translation size"
                                value={s.translation_size}
                                onChange={(v) => updateField(s.id, { translation_size: v })}
                              />
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-3 items-center gap-2 text-xs">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Duration (s)</Label>
                            <Input
                              type="number"
                              min={2}
                              defaultValue={s.interval_seconds}
                              onBlur={(e) =>
                                updateField(s.id, {
                                  interval_seconds: Math.max(2, Number(e.target.value) || 8),
                                })
                              }
                              className="h-8"
                            />
                          </div>
                          <label className="flex items-center gap-2">
                            <Switch
                              checked={s.show_header}
                              onCheckedChange={(v) => updateField(s.id, { show_header: v })}
                            />
                            <span>Header</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <Switch
                              checked={s.show_footer}
                              onCheckedChange={(v) => updateField(s.id, { show_footer: v })}
                            />
                            <span>Footer</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {data?.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">No slides yet.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
