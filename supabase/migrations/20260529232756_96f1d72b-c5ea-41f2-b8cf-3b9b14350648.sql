ALTER TABLE public.slideshow_images
  ADD COLUMN IF NOT EXISTS interval_seconds integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS show_header boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_footer boolean NOT NULL DEFAULT true;