import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MosqueSettings {
  id: string;
  mosque_name: string;
  zone: string;
  iqamah_subuh: number;
  iqamah_zohor: number;
  iqamah_asar: number;
  iqamah_maghrib: number;
  iqamah_isyak: number;
  ticker_speed: number;
  donation_goal: number;
  donation_current: number;
}

export interface Announcement {
  id: string;
  message: string;
  is_active: boolean;
  display_order: number;
}

export interface SlideshowImage {
  id: string;
  image_url: string;
  caption: string | null;
  is_active: boolean;
  display_order: number;
  interval_seconds: number;
  show_header: boolean;
  show_footer: boolean;
}

export function useMosqueSettings() {
  return useQuery({
    queryKey: ["mosque_settings"],
    queryFn: async (): Promise<MosqueSettings | null> => {
      const { data, error } = await supabase
        .from("mosque_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAnnouncements(activeOnly = true) {
  return useQuery({
    queryKey: ["announcements", activeOnly],
    queryFn: async (): Promise<Announcement[]> => {
      let q = supabase.from("announcements").select("*").order("display_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSlideshow(activeOnly = true) {
  return useQuery({
    queryKey: ["slideshow", activeOnly],
    queryFn: async (): Promise<SlideshowImage[]> => {
      let q = supabase.from("slideshow_images").select("*").order("display_order");
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Subscribe to realtime changes and invalidate caches so the TV refreshes instantly. */
export function useRealtimeDisplay() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("display-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "mosque_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["mosque_settings"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        qc.invalidateQueries({ queryKey: ["announcements"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "slideshow_images" }, () => {
        qc.invalidateQueries({ queryKey: ["slideshow"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}