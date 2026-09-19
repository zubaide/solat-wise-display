import { createServerFn } from "@tanstack/react-start";

export const getDisplayData = createServerFn({ method: "GET" }).handler(async () => {
  const { getSettings } = await import("../server/db.server");
  const { getTodayAndTomorrow } = await import("../server/prayer.server");
  const { listAnnouncements, listSlides } = await import("../server/content.server");

  const settings = getSettings();
  const { today, tomorrow } = await getTodayAndTomorrow(settings.zone);

  return {
    settings,
    today,
    tomorrow,
    announcements: listAnnouncements(),
    slides: listSlides(),
  };
});

export type DisplayData = Awaited<ReturnType<typeof getDisplayData>>;
