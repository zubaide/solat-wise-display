import { useEffect } from "react";

export const QURAN_FONT_FAMILY = '"QuranHafs", serif';

const FONT_URL = "/api/uploads/KFGQPC-Hafs-V30.ttf";

export function QuranFontFace() {
  useEffect(() => {
    void document.fonts?.load('48px "QuranHafs"');
  }, []);

  return (
    <style>
      {`@font-face {
  font-family: "QuranHafs";
  src: url("${FONT_URL}") format("truetype");
  font-display: block;
}`}
    </style>
  );
}
