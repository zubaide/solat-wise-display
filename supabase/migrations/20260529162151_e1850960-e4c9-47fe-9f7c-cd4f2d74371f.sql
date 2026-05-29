
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'editor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ MOSQUE SETTINGS (singleton row) ============
CREATE TABLE public.mosque_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_name TEXT NOT NULL DEFAULT 'Masjid Al-Hidayah',
  zone TEXT NOT NULL DEFAULT 'SGR02',
  iqamah_subuh INT NOT NULL DEFAULT 20,
  iqamah_zohor INT NOT NULL DEFAULT 10,
  iqamah_asar INT NOT NULL DEFAULT 10,
  iqamah_maghrib INT NOT NULL DEFAULT 5,
  iqamah_isyak INT NOT NULL DEFAULT 10,
  ticker_speed INT NOT NULL DEFAULT 40,
  donation_goal NUMERIC NOT NULL DEFAULT 25000,
  donation_current NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mosque_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mosque_settings TO authenticated;
GRANT ALL ON public.mosque_settings TO service_role;

ALTER TABLE public.mosque_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON public.mosque_settings FOR SELECT USING (true);
CREATE POLICY "Admins write settings" ON public.mosque_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.mosque_settings DEFAULT VALUES;

-- ============ ANNOUNCEMENTS ============
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active announcements" ON public.announcements
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.announcements (message, display_order) VALUES
  ('Selamat datang ke Masjid Al-Hidayah', 1),
  ('Kuliah Subuh: Setiap hari Sabtu selepas solat Subuh', 2),
  ('Sumbangan tabung masjid amat dihargai', 3);

-- ============ SLIDESHOW IMAGES ============
CREATE TABLE public.slideshow_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  caption TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.slideshow_images TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.slideshow_images TO authenticated;
GRANT ALL ON public.slideshow_images TO service_role;

ALTER TABLE public.slideshow_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active slides" ON public.slideshow_images
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write slides" ON public.slideshow_images
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.mosque_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slideshow_images;
