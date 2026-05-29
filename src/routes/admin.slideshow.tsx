import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSlideshow } from "@/lib/display-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/slideshow")({
  component: SlideshowPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

function SlideshowPage() {
  const { data, refetch, isLoading } = useSlideshow(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [interval, setIntervalSec] = useState(8);
  const [showHeader, setShowHeader] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  const add = async () => {
    if (!url.trim()) return;
    const { error } = await supabase.from("slideshow_images").insert({
      image_url: url.trim(),
      caption: caption.trim() || null,
      display_order: (data?.length ?? 0) + 1,
      interval_seconds: Math.max(2, Number(interval) || 8),
      show_header: showHeader,
      show_footer: showFooter,
    });
    if (error) toast.error(error.message);
    else {
      setUrl(""); setCaption("");
      toast.success("Slaid ditambah");
      refetch();
    }
  };

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("slideshow_images").update({ is_active }).eq("id", id);
    refetch();
  };

  type SlidePatch = Partial<{
    interval_seconds: number;
    show_header: boolean;
    show_footer: boolean;
    is_active: boolean;
    caption: string | null;
  }>;
  const updateField = async (id: string, patch: SlidePatch) => {
    const { error } = await supabase.from("slideshow_images").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    refetch();
  };

  const remove = async (id: string) => {
    await supabase.from("slideshow_images").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Slaid Paparan</h1>
        <p className="text-sm text-muted-foreground">
          Imej aktif dipaparkan berputar sebagai latar TV. Tetapkan tempoh setiap slaid dan
          sama ada header (nama masjid) atau footer (jam &amp; pengumuman) ditunjukkan semasa slaid itu.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-surface-2/40 p-4">
        <Input placeholder="URL imej (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Input placeholder="Kapsyen (pilihan)" value={caption} onChange={(e) => setCaption(e.target.value)} />
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

      {isLoading ? <p>Memuatkan...</p> : (
        <div className="grid grid-cols-2 gap-4">
          {data?.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-lg border border-border bg-surface-2/40">
              <img src={s.image_url} alt={s.caption ?? ""} className="h-40 w-full object-cover" />
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
                  <span className="flex-1 truncate text-sm">
                    {s.caption ?? <em className="text-muted-foreground">(tiada kapsyen)</em>}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 items-center gap-2 text-xs">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Tempoh (s)</Label>
                    <Input
                      type="number"
                      min={2}
                      defaultValue={s.interval_seconds}
                      onBlur={(e) =>
                        updateField(s.id, { interval_seconds: Math.max(2, Number(e.target.value) || 8) })
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
          {data?.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">Tiada slaid lagi.</p>}
        </div>
      )}
    </div>
  );
}