import { parseTimeToToday } from "@/lib/prayer-utils";

export interface KuliahRow {
  id: string;
  title: string;
  speaker: string;
  speaker_photo_url: string;
  date: string;
  time_text: string;
  background_url: string;
  duration_seconds: number;
  is_active: boolean;
}

export interface KuliahInput {
  title: string;
  speaker: string;
  speaker_photo_url: string;
  date: string;
  time_text: string;
  background_url: string;
  duration_seconds: number;
  is_active: boolean;
}

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function listKuliah(): Promise<KuliahRow[]> {
  return jsonOrThrow(await fetch("/api/data/kuliah"));
}

export async function listKuliahAdmin(): Promise<KuliahRow[]> {
  return jsonOrThrow(await fetch("/api/admin/kuliah", { credentials: "include" }));
}

export async function addKuliah(data: KuliahInput): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/admin/kuliah", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    }),
  );
}

export async function updateKuliah(id: string, data: KuliahInput): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch("/api/admin/kuliah", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
      credentials: "include",
    }),
  );
}

export async function deleteKuliah(id: string): Promise<{ ok: true }> {
  return jsonOrThrow(
    await fetch(`/api/admin/kuliah?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    }),
  );
}

export function getKuliahCutoff(
  isyak: string,
  iqamahMinutes: number,
  blackoutSeconds: number,
): Date {
  const isyakAt = parseTimeToToday(isyak);
  if (!iqamahMinutes) return isyakAt;
  return new Date(isyakAt.getTime() + iqamahMinutes * 60_000 + blackoutSeconds * 1_000);
}

export function getVisibleKuliah(
  rows: KuliahRow[],
  today: string,
  now: Date,
  cutoff: Date | null,
): KuliahRow[] {
  return rows.filter((k) => {
    if (!k.is_active) return false;
    if (k.date > today) return true;
    if (k.date < today) return false;
    return !cutoff || now < cutoff;
  });
}
