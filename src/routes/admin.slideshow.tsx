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
import { TextSlide, type TextSlideData } from "@/components/display/TextSlide";
import { QuranFontFace, QURAN_FONT_FAMILY } from "@/components/display/QuranFontFace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/slideshow")({
  component: SlideshowPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

const TEXTAREA_CLASS = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const SIZE_STEP = 10;
const SIZE_MIN = 30;
const SIZE_MAX = 400;

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

function parseRef(input: string) {
  const m = input.trim().match(/^(\d{1,3}):(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/);
  if (!m) return null;
  const from = Number(m[2]);
  return { surah: Number(m[1]), from, to: m[3] ? Number(m[3]) : from };
}

function slideLabel(s: SlideRow) {
  if (s.slide_type === "text") {
    return s.title || s.translation || s.quran_ref || "(slaid teks)";
  }
  return s.caption ?? "";
}

async function uploadImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  if (!res.ok) {
    toast.error("Muat naik gagal");
    return null;
  }
  const j = (await res.json()) as { url: string };
  return j.url;
}

function SlideshowPage() {
  const { data, refetch, isLoading } = useSlideshow(false);
  const [slideType, setSlideType] = useState<SlideType>("photo");
  const [interval, setIntervalSec] = useState(8);
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const [title, setTitle] = useState("");
  const [refInput, setRefInput] = useState("");
  const [arabic, setArabic] = useState("");
  const [quranRef, setQuranRef] = useState("");
  const [fetched, setFetched] = useState<{ text: string; ref: string } | null>(null);
  const [translation, setTranslation] = useState("");
  const [titleSize, setTitleSize] = useState(100);
  const [arabicSize, setArabicSize] = useState(100);
  const [translationSize, setTranslationSize] = useState(100);
  const [background, setBackground] = useState("");

  const fetchQuran = async () => {
    const r = parseRef(refInput);
    if (!r) {
      toast.error("Format rujukan: 2:255 atau 2:285-286");
      return;
    }
    try {
      const res = await lookupQuran({ data: r });
      setArabic(res.text);
      setQuranRef(res.ref);
      setFetched(res);
      toast.success("Teks Tanzil dimuatkan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat");
    }
  };

  const onArabicChange = (v: string) => {
    setArabic(v);
    setQuranRef(fetched && v === fetched.text ? fetched.ref : "");
  };

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
        if (!title.trim() && !arabic.trim() && !translation.trim()) {
          toast.error("Isi sekurang-kurangnya satu baris");
          return;
        }
        await addSlide({
          data: {
            slide_type: "text",
            image_url: background.trim(),
            title: title.trim(),
            arabic_text: arabic.trim(),
            quran_ref: quranRef,
            translation: translation.trim(),
            title_size: titleSize,
            arabic_size: arabicSize,
            translation_size: translationSize,
            interval_seconds: Math.max(2, Number(interval) || 8),
            show_header: showHeader,
            show_footer: showFooter,
          },
        });
        setTitle("");
        setRefInput("");
        setArabic("");
        setQuranRef("");
        setFetched(null);
        setTranslation("");
        setBackground("");
      }
      toast.success("Slaid ditambah");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ralat");
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
      toast.error(e instanceof Error ? e.message : "Ralat");
    }
  };

  const changeBackground = async (id: string, file: File) => {
    const u = await uploadImage(file);
    if (u) await updateField(id, { image_url: u });
  };

  const remove = async (id: string) => {
    await deleteSlide({ data: { id } });
    refetch();
  };

  return (
    <>
      <QuranFontFace />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Slaid Paparan</h1>
          <p className="text-sm text-muted-foreground">
            Slaid aktif dipaparkan berputar sebagai latar TV. Slaid boleh berupa gambar atau teks
            (doa / hadis). Tetapkan tempoh setiap slaid dan sama ada header (nama masjid) atau
            footer (jam &amp; pengumuman) ditunjukkan semasa slaid itu.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-surface-2/40 p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={slideType === "photo" ? "default" : "outline"}
              onClick={() => setSlideType("photo")}
            >
              Gambar
            </Button>
            <Button
              type="button"
              variant={slideType === "text" ? "default" : "outline"}
              onClick={() => setSlideType("text")}
            >
              Teks (Doa / Hadis)
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
                    toast.success("Imej dimuat naik — tekan Tambah Slaid");
                  }
                }}
              />
              <Input
                placeholder="atau URL imej"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Input
                placeholder="Kapsyen (pilihan)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <SizeRow label="Baris 1 · Tajuk" value={titleSize} onChange={setTitleSize} />
                <Input
                  placeholder="cth. Doa Hari Ini"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <SizeRow label="Baris 2 · Al-Quran" value={arabicSize} onChange={setArabicSize} />
                <div className="flex gap-2">
                  <Input
                    placeholder="Rujukan, cth. 2:255 atau 2:285-286"
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={fetchQuran}>
                    Ambil dari Tanzil
                  </Button>
                </div>
                <textarea
                  dir="rtl"
                  lang="ar"
                  rows={4}
                  className={TEXTAREA_CLASS}
                  style={{ fontFamily: QURAN_FONT_FAMILY, fontSize: "1.5rem", lineHeight: 1.9 }}
                  value={arabic}
                  onChange={(e) => onArabicChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {quranRef ? (
                    <>Teks Tanzil {quranRef} — kredit tanzil.net dipaparkan pada slaid.</>
                  ) : arabic ? (
                    <>
                      Teks ditaip atau ditampal sendiri — kredit Tanzil tidak dipaparkan. Tampal
                      hanya dari{" "}
                      <a
                        href="https://tanzil.net"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        tanzil.net
                      </a>
                      .
                    </>
                  ) : (
                    <>Teks Al-Quran diambil daripada fail Tanzil di Pi.</>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <SizeRow
                  label="Baris 3 · Terjemahan"
                  value={translationSize}
                  onChange={setTranslationSize}
                />
                <textarea
                  rows={3}
                  className={TEXTAREA_CLASS}
                  placeholder="Terjemahan (Bahasa Melayu atau English)"
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Latar belakang (pilihan — kosong = biru gelap)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const u = await uploadImage(f);
                    if (u) {
                      setBackground(u);
                      toast.success("Latar dimuat naik");
                    }
                  }}
                />
                {background && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setBackground("")}>
                    Buang latar
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Pratonton</Label>
                <PreviewBox
                  slide={{
                    image_url: background,
                    title,
                    arabic_text: arabic,
                    quran_ref: quranRef,
                    translation,
                    title_size: titleSize,
                    arabic_size: arabicSize,
                    translation_size: translationSize,
                  }}
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Tempoh (saat)</Label>
              <Input
                type="number"
                min={2}
                value={interval}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={showHeader} onCheckedChange={setShowHeader} />
              <Label className="text-xs">Tunjuk Header</Label>
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={showFooter} onCheckedChange={setShowFooter} />
              <Label className="text-xs">Tunjuk Footer</Label>
            </div>
          </div>
          <Button onClick={add}>Tambah Slaid</Button>
        </div>

        {isLoading ? (
          <p>Memuatkan...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {data?.map((s) => (
              <div
                key={s.id}
                className="overflow-hidden rounded-lg border border-border bg-surface-2/40"
              >
                {s.slide_type === "text" ? (
                  <PreviewBox slide={s} />
                ) : (
                  <img src={s.image_url} alt={s.caption ?? ""} className="h-40 w-full object-cover" />
                )}
                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
                    <span className="flex-1 truncate text-sm">
                      {slideLabel(s) || <em className="text-muted-foreground">(tiada kapsyen)</em>}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {s.slide_type === "text" && (
                    <div className="space-y-2">
                      {s.title && (
                        <SizeRow
                          label="Saiz tajuk"
                          value={s.title_size}
                          onChange={(v) => updateField(s.id, { title_size: v })}
                        />
                      )}
                      {s.arabic_text && (
                        <SizeRow
                          label="Saiz Al-Quran"
                          value={s.arabic_size}
                          onChange={(v) => updateField(s.id, { arabic_size: v })}
                        />
                      )}
                      {s.translation && (
                        <SizeRow
                          label="Saiz terjemahan"
                          value={s.translation_size}
                          onChange={(v) => updateField(s.id, { translation_size: v })}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="h-8 text-xs"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void changeBackground(s.id, f);
                          }}
                        />
                        {s.image_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateField(s.id, { image_url: "" })}
                          >
                            Latar lalai
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 items-center gap-2 text-xs">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Tempoh (s)</Label>
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
              </div>
            ))}
            {data?.length === 0 && (
              <p className="col-span-2 text-sm text-muted-foreground">Tiada slaid lagi.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
