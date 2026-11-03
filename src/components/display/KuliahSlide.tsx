import type { KuliahRow } from "@/lib/kuliah.functions";
import { klToday, getDaysLeft, formatGregorianDate } from "@/lib/islamic-events.functions";

interface Props {
  kuliah: KuliahRow;
}

export function KuliahSlide({ kuliah }: Props) {
  const today = klToday();
  const daysLeft = getDaysLeft(kuliah.date, today);
  const isToday = daysLeft === 0;
  const isNear = daysLeft > 0 && daysLeft <= 3;
  const hasPhoto = !!kuliah.speaker_photo_url;
  const hasSpeaker = !!kuliah.speaker;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {kuliah.background_url ? (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${kuliah.background_url})`,
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

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center px-12 text-center">
        {!hasPhoto && <div className="mb-4 text-6xl">📖</div>}

        <p className="mb-3 text-2xl font-semibold uppercase tracking-[0.35em] text-gold">Kuliah</p>

        <h1 className="mb-4 font-display text-5xl font-bold leading-tight text-white">
          {kuliah.title}
        </h1>

        {(hasPhoto || hasSpeaker) && (
          <div className="mb-6 flex items-center justify-center gap-6">
            {hasPhoto && (
              <img
                src={kuliah.speaker_photo_url}
                alt={kuliah.speaker}
                className="h-36 w-36 flex-shrink-0 rounded-full border-4 border-gold object-cover shadow-gold"
              />
            )}
            {hasSpeaker && (
              <p className={["text-3xl text-white/90", hasPhoto ? "text-left" : ""].join(" ")}>
                <span className="text-white/60">Penceramah: </span>
                {kuliah.speaker}
              </p>
            )}
          </div>
        )}

        <p className="mb-1 text-2xl text-gold">{formatGregorianDate(kuliah.date)}</p>
        {kuliah.time_text && <p className="mb-8 text-2xl text-white/80">{kuliah.time_text}</p>}
        {!kuliah.time_text && <div className="mb-8" />}

        <div
          className={[
            "rounded-2xl border-2 px-14 py-5",
            isToday
              ? "border-gold bg-gold/10 shadow-gold"
              : isNear
                ? "animate-pulse border-gold bg-gold/10"
                : "border-white/25 bg-white/5",
          ].join(" ")}
        >
          <p
            className={[
              "font-display text-6xl font-extrabold tracking-wide",
              isToday || isNear ? "text-gold" : "text-white",
            ].join(" ")}
          >
            {isToday ? "Hari Ini! ✨" : daysLeft === 1 ? "Esok!" : `${daysLeft} hari lagi`}
          </p>
        </div>
      </div>
    </div>
  );
}
