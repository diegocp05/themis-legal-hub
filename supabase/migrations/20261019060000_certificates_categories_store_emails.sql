-- ───────────── Events: category, registration deadline, certificate ─────────────
CREATE TYPE public.event_category AS ENUM ('faculdade', 'festa', 'esporte', 'outro');

ALTER TABLE public.events
  ADD COLUMN category public.event_category NOT NULL DEFAULT 'faculdade',
  ADD COLUMN registration_closes_at timestamptz,
  ADD COLUMN certificate_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN certificate_hours numeric(5, 1) CHECK (certificate_hours IS NULL OR certificate_hours > 0);

-- ───────────── Registrations: e-mail delivery tracking ─────────────
ALTER TABLE public.registrations
  ADD COLUMN confirmation_sent_at timestamptz,
  ADD COLUMN reminder_sent_at timestamptz;

-- Registration with honeypot (_website must stay empty) and deadline check.
DROP FUNCTION IF EXISTS public.register_for_event(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.register_for_event(
  _event_id uuid, _full_name text, _email text, _ra text, _website text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.events%ROWTYPE;
  clean_name text := trim(coalesce(_full_name, ''));
  clean_email text := lower(trim(coalesce(_email, '')));
  clean_ra text := trim(coalesce(_ra, ''));
  taken integer;
BEGIN
  -- Bots fill the hidden field; answer as if it worked so they don't retry.
  IF coalesce(_website, '') <> '' THEN RETURN jsonb_build_object('status', 'ok'); END IF;

  IF length(clean_name) NOT BETWEEN 3 AND 120
     OR clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(clean_email) > 160
     OR length(clean_ra) NOT BETWEEN 1 AND 30 THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id AND published FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT ev.registration_open
     OR coalesce(ev.ends_at, ev.starts_at) < now()
     OR (ev.registration_closes_at IS NOT NULL AND ev.registration_closes_at <= now()) THEN
    RETURN jsonb_build_object('status', 'closed');
  END IF;

  IF EXISTS (SELECT 1 FROM public.registrations r WHERE r.event_id = ev.id AND (lower(r.email) = clean_email OR lower(r.ra) = lower(clean_ra))) THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  IF ev.capacity IS NOT NULL THEN
    SELECT count(*) INTO taken FROM public.registrations WHERE event_id = ev.id;
    IF taken >= ev.capacity THEN RETURN jsonb_build_object('status', 'full'); END IF;
  END IF;

  INSERT INTO public.registrations (event_id, full_name, email, ra) VALUES (ev.id, clean_name, clean_email, clean_ra);
  RETURN jsonb_build_object('status', 'ok');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_for_event(uuid, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, text, text, text, text) TO anon, authenticated;

-- Certificate lookup: requires the e-mail AND the RA of a registration with confirmed attendance.
CREATE OR REPLACE FUNCTION public.issue_certificate(_event_id uuid, _email text, _ra text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.events%ROWTYPE;
  reg public.registrations%ROWTYPE;
BEGIN
  SELECT * INTO ev FROM public.events
  WHERE id = _event_id AND published AND certificate_enabled AND coalesce(ends_at, starts_at) <= now();
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'unavailable'); END IF;

  SELECT * INTO reg FROM public.registrations r
  WHERE r.event_id = ev.id AND lower(r.email) = lower(trim(coalesce(_email, ''))) AND lower(r.ra) = lower(trim(coalesce(_ra, '')));
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF reg.checked_in_at IS NULL THEN RETURN jsonb_build_object('status', 'no_attendance'); END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'name', reg.full_name,
    'ra', reg.ra,
    'event_title', ev.title,
    'starts_at', ev.starts_at,
    'ends_at', ev.ends_at,
    'location', ev.location,
    'hours', ev.certificate_hours
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text) TO anon, authenticated;

-- ───────────── Board members: sector and Instagram ─────────────
ALTER TABLE public.board_members
  ADD COLUMN sector text NOT NULL DEFAULT 'Diretoria' CHECK (length(trim(sector)) BETWEEN 2 AND 60),
  ADD COLUMN instagram text CHECK (instagram IS NULL OR instagram ~ '^[A-Za-z0-9._]{1,30}$');

-- ───────────── Products: storefront status ─────────────
CREATE TYPE public.product_status AS ENUM ('disponivel', 'esgotado', 'em_breve');
ALTER TABLE public.products ADD COLUMN status public.product_status NOT NULL DEFAULT 'disponivel';
