import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAnnouncements } from "@/lib/display-data";
import { addAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/announcements.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/announcements")({
  component: AnnouncementsPage,
  errorComponent: ({ error }) => <p>{error.message}</p>,
  notFoundComponent: () => <p>Not found</p>,
});

function AnnouncementsPage() {
  const { data, refetch, isLoading } = useAnnouncements(false);
  const [newMsg, setNewMsg] = useState("");

  const add = async () => {
    if (!newMsg.trim()) return;
    try {
      await addAnnouncement({ data: { message: newMsg.trim() } });
      setNewMsg("");
      toast.success("Pengumuman ditambah");
      refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Ralat"); }
  };
  const toggle = async (id: string, is_active: boolean) => {
    await updateAnnouncement({ data: { id, is_active } });
    refetch();
  };
  const remove = async (id: string) => {
    await deleteAnnouncement({ data: { id } });
    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengumuman (Ticker)</h1>
        <p className="text-sm text-muted-foreground">Mesej aktif akan ditayangkan secara berulang di skrin.</p>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Mesej baharu..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)} />
        <Button onClick={add}>Tambah</Button>
      </div>

      {isLoading ? <p>Memuatkan...</p> : (
        <div className="space-y-2">
          {data?.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 p-3">
              <Switch checked={a.is_active} onCheckedChange={(v) => toggle(a.id, v)} />
              <span className="flex-1">{a.message}</span>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {data?.length === 0 && <p className="text-sm text-muted-foreground">Tiada pengumuman lagi.</p>}
        </div>
      )}
    </div>
  );
}