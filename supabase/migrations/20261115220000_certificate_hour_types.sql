-- Complementary and mandatory hours can differ. The old single amount becomes the complementary one.
ALTER TABLE public.events
  ADD COLUMN certificate_complementary_hours numeric(5, 1)
    CHECK (certificate_complementary_hours IS NULL OR certificate_complementary_hours > 0),
  ADD COLUMN certificate_mandatory_hours numeric(5, 1)
    CHECK (certificate_mandatory_hours IS NULL OR certificate_mandatory_hours > 0);

UPDATE public.events
SET certificate_complementary_hours = certificate_hours
WHERE certificate_hours IS NOT NULL AND certificate_complementary_hours IS NULL;

DROP FUNCTION IF EXISTS public.issue_certificate(uuid, text, text);

CREATE FUNCTION public.issue_certificate(_event_id uuid, _email text, _ra text, _year int, _hour_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.events%ROWTYPE;
  reg public.registrations%ROWTYPE;
  kind text;
  chosen numeric;
BEGIN
  IF _year IS NULL OR _year < 1 OR _year > 5 THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  kind := lower(trim(coalesce(_hour_type, '')));
  IF kind NOT IN ('complementar', 'obrigatoria') THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  IF _year <= 3 AND kind = 'obrigatoria' THEN
    RETURN jsonb_build_object('status', 'year_restricted');
  END IF;

  SELECT * INTO ev FROM public.events
  WHERE id = _event_id AND published AND certificate_enabled AND coalesce(ends_at, starts_at) <= now();
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'unavailable'); END IF;

  SELECT * INTO reg FROM public.registrations r
  WHERE r.event_id = ev.id
    AND lower(r.email) = lower(trim(coalesce(_email, '')))
    AND lower(r.ra) = lower(trim(coalesce(_ra, '')));
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF reg.checked_in_at IS NULL THEN RETURN jsonb_build_object('status', 'no_attendance'); END IF;

  chosen := CASE
    WHEN kind = 'obrigatoria' THEN ev.certificate_mandatory_hours
    ELSE coalesce(ev.certificate_complementary_hours, ev.certificate_hours)
  END;
  IF chosen IS NULL THEN RETURN jsonb_build_object('status', 'hours_missing'); END IF;

  RETURN jsonb_build_object(
    'status', 'ok',
    'name', reg.full_name,
    'ra', reg.ra,
    'event_title', ev.title,
    'starts_at', ev.starts_at,
    'ends_at', ev.ends_at,
    'location', ev.location,
    'hours', chosen,
    'hour_type', kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_certificate(uuid, text, text, int, text) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text, int, text) TO anon, authenticated;
