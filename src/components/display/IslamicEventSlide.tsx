import type { IslamicEventRow } from "@/lib/islamic-events.functions";
import { klToday, getEventState, getDaysLeft, formatGregorianDate } from "@/lib/islamic-events.functions";

interface Props {
  event: IslamicEventRow;
}

export function IslamicEventSlide({ event }: Props) {
  const today = klToday();
  const state = getEventState(event.date, today);
  const daysLeft = getDaysLeft(event.date, today);
  const isNear = state === "upcoming" && daysLeft <= 7;
  const formattedDate = formatGregorianDate(event.date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {event.background_url ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${event.background_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 55% 35%, #0e2248 0%, #050d1e 100%)" }}
        />
      )}
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-4xl w-full">
        <div className="text-6xl mb-5">🌙</div>

        <h1 className="font-display text-5xl font-bold text-white mb-2 leading-tight">
          {event.name}
        </h1>

        <p className="text-2xl text-gold mb-1">{event.hijri_label} H</p>
        <p className="text-lg text-white/60 mb-8">{formattedDate}</p>

        {state === "today" ? (
          <>
            <div className="mb-6 px-14 py-5 rounded-2xl border-2 border-gold bg-gold/10 shadow-gold">
              <p className="font-display text-6xl font-extrabold text-gold tracking-wide">
                Hari Ini! ✨
              </p>
            </div>
            {event.hari_ini_message && (
              <p className="text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                {event.hari_ini_message}
              </p>
            )}
          </>
        ) : (
          <>
            <div
              className={[
                "mb-6 px-14 py-5 rounded-2xl border-2 transition-all",
                isNear
                  ? "border-gold bg-gold/10 animate-pulse"
                  : "border-white/25 bg-white/5",
              ].join(" ")}
            >
              <p
                className={[
                  "font-display text-6xl font-extrabold tracking-wide",
                  isNear ? "text-gold" : "text-white",
                ].join(" ")}
              >
                {daysLeft === 1 ? "Esok!" : `${daysLeft} hari lagi`}
              </p>
            </div>

            {event.custom_text && (
              <p className="text-xl text-white/80 mb-4 max-w-2xl leading-relaxed">
                {event.custom_text}
              </p>
            )}

            {event.is_subject_to_announcement && !event.date_confirmed && (
              <p className="mt-3 text-sm text-white/40 max-w-xl leading-relaxed italic">
                * Tertakluk kepada pengumuman rasmi Penyimpan Mohor Besar Raja-Raja Malaysia
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
