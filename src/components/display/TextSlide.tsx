import type { CSSProperties } from "react";
import { QuranFontFace, QURAN_FONT_FAMILY } from "./QuranFontFace";

export interface TextSlideData {
  image_url: string;
  title: string;
  arabic_text: string;
  quran_ref: string;
  translation: string;
  title_size: number;
  arabic_size: number;
  translation_size: number;
}

const TITLE_BASE = 3.6;
const ARABIC_BASE = 5.8;
const TRANSLATION_BASE = 2.8;

const sized = (base: number, percent: number): CSSProperties => ({
  fontSize: `${(base * percent) / 100}cqw`,
});

export function TextSlide({ slide }: { slide: TextSlideData }) {
  const hasImage = slide.image_url.length > 0;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ containerType: "inline-size" } as CSSProperties}
    >
      {slide.arabic_text && <QuranFontFace />}

      {hasImage ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("${slide.image_url}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 55% 35%, #0e2248 0%, #050d1e 100%)" }}
        />
      )}

      <div
        className="relative z-10 flex h-full flex-col items-center justify-center text-center"
        style={{ gap: "2cqw", padding: "0 5cqw", textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
      >
        {slide.title && (
          <h2
            className="font-display font-bold leading-tight text-gold"
            style={sized(TITLE_BASE, slide.title_size)}
          >
            {slide.title}
          </h2>
        )}

        {slide.arabic_text && (
          <p
            dir="rtl"
            lang="ar"
            className="text-white"
            style={{
              ...sized(ARABIC_BASE, slide.arabic_size),
              fontFamily: QURAN_FONT_FAMILY,
              lineHeight: 1.9,
            }}
          >
            {slide.arabic_text}
          </p>
        )}

        {slide.translation && (
          <p
            className="leading-relaxed text-white/90"
            style={sized(TRANSLATION_BASE, slide.translation_size)}
          >
            {slide.translation}
          </p>
        )}
      </div>

      {slide.quran_ref && (
        <p
          className="absolute inset-x-0 text-center text-white/50"
          style={{ bottom: "1cqw", fontSize: "1.2cqw" }}
        >
          Al-Quran {slide.quran_ref} · Sumber teks: tanzil.net
        </p>
      )}
    </div>
  );
}
