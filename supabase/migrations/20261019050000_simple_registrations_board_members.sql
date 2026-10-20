-- ───────────── Registrations: only name, e-mail, RA and attendance ─────────────
DROP FUNCTION IF EXISTS public.register_for_event(uuid, text, text, text, text, text, boolean);
DROP INDEX IF EXISTS public.registrations_event_cpf_key;

DELETE FROM public.registrations WHERE ra IS NULL;

ALTER TABLE public.registrations
  DROP COLUMN code,
  DROP COLUMN cpf,
  DROP COLUMN phone,
  DROP COLUMN consent_at,
  DROP COLUMN user_id,
  ALTER COLUMN ra SET NOT NULL;

CREATE UNIQUE INDEX registrations_event_ra_key ON public.registrations (event_id, lower(ra));

CREATE OR REPLACE FUNCTION public.register_for_event(_event_id uuid, _full_name text, _email text, _ra text)
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
  IF length(clean_name) NOT BETWEEN 3 AND 120
     OR clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(clean_email) > 160
     OR length(clean_ra) NOT BETWEEN 1 AND 30 THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  SELECT * INTO ev FROM public.events WHERE id = _event_id AND published FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF NOT ev.registration_open OR coalesce(ev.ends_at, ev.starts_at) < now() THEN
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

REVOKE EXECUTE ON FUNCTION public.register_for_event(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid, text, text, text) TO anon, authenticated;

-- ───────────── DA board members shown on the home page ─────────────
CREATE TABLE public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 120),
  role text NOT NULL CHECK (length(trim(role)) BETWEEN 2 AND 80),
  photo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER board_members_updated_at BEFORE UPDATE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active board members" ON public.board_members FOR SELECT TO anon, authenticated
  USING (active);
CREATE POLICY "Admins manage board members" ON public.board_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.board_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT ALL ON public.board_members TO service_role;

INSERT INTO public.board_members (name, role, photo_url, sort_order) VALUES
  ('Helena Duarte', 'Presidente', '/media/diretoria/helena.jpg', 1),
  ('Lucas Ferraz', 'Vice-Presidente', '/media/diretoria/lucas.jpg', 2),
  ('Beatriz Ramos', 'Diretora Financeira', '/media/diretoria/beatriz.jpg', 3),
  ('Gabriel Monteiro', 'Diretor de Eventos', '/media/diretoria/gabriel.jpg', 4),
  ('Sofia Almeida', 'Diretora de Marketing', '/media/diretoria/sofia.jpg', 5),
  ('Pedro Henrique', 'Secretário-Geral', '/media/diretoria/pedro.jpg', 6);
