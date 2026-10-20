-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- ───────────── Events ─────────────
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  summary text,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  image_url text,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  registration_open boolean NOT NULL DEFAULT true,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX events_starts_at_idx ON public.events (starts_at);
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) > 0),
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX event_schedule_event_idx ON public.event_schedule (event_id, sort_order);

-- Registrations are free and need no account; they are written only through register_for_event().
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT ('THM-EV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  full_name text NOT NULL,
  email text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  ra text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_at timestamptz NOT NULL,
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX registrations_event_email_key ON public.registrations (event_id, lower(email));
CREATE UNIQUE INDEX registrations_event_cpf_key ON public.registrations (event_id, cpf);
CREATE INDEX registrations_email_idx ON public.registrations (lower(email));

-- ───────────── Home content ─────────────
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) > 0),
  body text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ───────────── Products ─────────────
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  image_url text,
  sizes text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ───────────── Sales (skeleton: no checkout writes yet) ─────────────
CREATE TYPE public.order_status AS ENUM (
  'aguardando_pagamento', 'pago', 'em_producao', 'aguardando_retirada', 'entregue', 'cancelado'
);
CREATE TYPE public.payment_method AS ENUM ('pix', 'cartao');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('THM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  ra text,
  status public.order_status NOT NULL DEFAULT 'aguardando_pagamento',
  payment_method public.payment_method,
  subtotal numeric(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  total numeric(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON public.orders (user_id);
CREATE INDEX orders_status_idx ON public.orders (status);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  size text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0)
);
CREATE INDEX order_items_order_idx ON public.order_items (order_id);

-- ───────────── Row Level Security ─────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published events" ON public.events FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Admins manage events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads schedule of published events" ON public.event_schedule FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.published));
CREATE POLICY "Admins manage schedule" ON public.event_schedule FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage registrations" ON public.registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads published announcements" ON public.announcements FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own orders" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.events, public.event_schedule, public.announcements, public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events, public.event_schedule, public.announcements, public.products,
  public.registrations, public.orders, public.order_items TO authenticated;
GRANT ALL ON public.events, public.event_schedule, public.announcements, public.products,
  public.registrations, public.orders, public.order_items TO service_role;

-- ───────────── Registration functions ─────────────
CREATE OR REPLACE FUNCTION public.register_for_event(
  _event_id uuid, _full_name text, _email text, _cpf text, _phone text, _ra text, _consent boolean
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ev public.events%ROWTYPE;
  taken integer;
  clean_cpf text := regexp_replace(coalesce(_cpf, ''), '\D', '', 'g');
  clean_phone text := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  clean_email text := lower(trim(coalesce(_email, '')));
  new_code text;
BEGIN
  IF NOT coalesce(_consent, false) THEN RETURN jsonb_build_object('status', 'consent_required'); END IF;
  IF length(trim(coalesce(_full_name, ''))) < 3 OR length(_full_name) > 120
     OR clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(clean_email) > 160
     OR length(clean_cpf) <> 11 OR length(clean_phone) NOT BETWEEN 10 AND 11
     OR length(coalesce(_ra, '')) > 30 THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id AND published FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT ev.registration_open OR coalesce(ev.ends_at, ev.starts_at) < now() THEN
    RETURN jsonb_build_object('status', 'closed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.registrations r WHERE r.event_id = ev.id AND (lower(r.email) = clean_email OR r.cpf = clean_cpf)) THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  IF ev.capacity IS NOT NULL THEN
    SELECT count(*) INTO taken FROM public.registrations WHERE event_id = ev.id;
    IF taken >= ev.capacity THEN RETURN jsonb_build_object('status', 'full'); END IF;
  END IF;

  INSERT INTO public.registrations (event_id, full_name, email, cpf, phone, ra, user_id, consent_at)
  VALUES (ev.id, trim(_full_name), clean_email, clean_cpf, clean_phone, nullif(trim(coalesce(_ra, '')), ''), auth.uid(), now())
  RETURNING code INTO new_code;

  RETURN jsonb_build_object('status', 'ok', 'code', new_code);
END; $$;

CREATE OR REPLACE FUNCTION public.event_spots_taken(_event_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.event_id = _event_id AND e.published
$$;

-- Tickets of the signed-in student, matched by account or by the e-mail used in the form
CREATE OR REPLACE FUNCTION public.my_registrations()
RETURNS TABLE (code text, created_at timestamptz, event_id uuid, event_slug text, event_title text,
               event_location text, event_starts_at timestamptz, event_ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.code, r.created_at, e.id, e.slug, e.title, e.location, e.starts_at, e.ends_at
  FROM public.registrations r JOIN public.events e ON e.id = r.event_id
  WHERE auth.uid() IS NOT NULL
    AND (r.user_id = auth.uid() OR lower(r.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  ORDER BY e.starts_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.register_for_event(uuid, text, text, text, text, text, boolean),
  public.event_spots_taken(uuid), public.my_registrations() FROM public;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, text, text, text, text, text, boolean),
  public.event_spots_taken(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_registrations() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;

-- ───────────── Image storage ─────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

-- ───────────── Starter content ─────────────
WITH ev AS (
  INSERT INTO public.events (slug, title, summary, description, location, starts_at, ends_at, image_url, capacity, published, featured)
  VALUES ('semana-juridica-2026', 'Semana Jurídica 2026',
    'Três dias de debates, carreira e conexões com grandes nomes do Direito.',
    'Uma jornada acadêmica com palestras, mesas de debate e oportunidades de networking. Nesta edição, especialistas discutem os caminhos do Direito contemporâneo e as novas possibilidades de carreira.',
    'Auditório Central', '2026-11-23 18:00-03', '2026-11-25 22:00-03', '/media/semana-juridica.jpg', 280, true, true)
  RETURNING id
)
INSERT INTO public.event_schedule (event_id, label, sort_order)
SELECT ev.id, s.label, s.ord FROM ev, (VALUES
  ('23 nov · Direito, tecnologia e sociedade', 1),
  ('24 nov · Carreiras jurídicas na prática', 2),
  ('25 nov · Tribunal simulado e encerramento', 3)
) AS s(label, ord);

INSERT INTO public.products (name, price, image_url, sizes, sort_order) VALUES
  ('Camiseta Themis', 69.90, '/media/camiseta-themis.jpg', ARRAY['PP', 'P', 'M', 'G', 'GG'], 1),
  ('Tirante Institucional', 24.90, '/media/tirante-themis.jpg', ARRAY['Único'], 2),
  ('Copo Térmico Themis', 49.90, '/media/copo-themis.jpg', ARRAY['500 ml'], 3);

INSERT INTO public.announcements (title, body) VALUES
  ('Retirada de carteirinhas estudantis', 'Disponível na sala do DA, de segunda a sexta, das 18h às 20h30.');
