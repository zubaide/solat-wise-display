import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSlideshow } from "@/lib/display-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

  const add = async () => {
    if (!url.trim()) return;
    const { error } = await supabase.from("slideshow_images").insert({
      image_url: url.trim(),
      caption: caption.trim() || null,
      display_order: (data?.length ?? 0) + 1,
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

  const remove = async (id: string) => {
    await supabase.from("slideshow_images").delete().eq("id", id);
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Slaid Paparan</h1>
        <p className="text-sm text-muted-foreground">Imej yang aktif akan dipaparkan secara berputar di skrin TV.</p>
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-surface-2/40 p-4">
        <Input placeholder="URL imej (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Input placeholder="Kapsyen (pilihan)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <Button onClick={add}>Tambah Slaid</Button>
      </div>

      {isLoading ? <p>Memuatkan...</p> : (
        <div className="grid grid-cols-2 gap-4">
          {data?.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-lg border border-border bg-surface-2/40">
              <img src={s.image_url} alt={s.caption ?? ""} className="h-40 w-full object-cover" />
              <div className="flex items-center gap-2 p-3">
                <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
                <span className="flex-1 truncate text-sm">{s.caption ?? <em className="text-muted-foreground">(tiada kapsyen)</em>}</span>
                <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {data?.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">Tiada slaid lagi.</p>}
        </div>
      )}
    </div>
  );
}