-- One blank certificate model. Releasing an event copies these signatures onto that event.
CREATE TABLE public.certificate_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  da_name text CHECK (da_name IS NULL OR char_length(da_name) BETWEEN 1 AND 80),
  da_signature text,
  coordinator_name text CHECK (coordinator_name IS NULL OR char_length(coordinator_name) BETWEEN 1 AND 80),
  coordinator_signature text,
  athletics_name text CHECK (athletics_name IS NULL OR char_length(athletics_name) BETWEEN 1 AND 80),
  athletics_signature text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  singleton boolean NOT NULL DEFAULT true UNIQUE
);

INSERT INTO public.certificate_template (singleton) VALUES (true);

ALTER TABLE public.certificate_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read the certificate template" ON public.certificate_template
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update the certificate template" ON public.certificate_template
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, UPDATE ON public.certificate_template TO authenticated;
GRANT ALL ON public.certificate_template TO service_role;

ALTER TABLE public.events
  ADD COLUMN certificate_da_name text CHECK (certificate_da_name IS NULL OR char_length(certificate_da_name) BETWEEN 1 AND 80),
  ADD COLUMN certificate_da_signature text,
  ADD COLUMN certificate_coordinator_name text CHECK (certificate_coordinator_name IS NULL OR char_length(certificate_coordinator_name) BETWEEN 1 AND 80),
  ADD COLUMN certificate_coordinator_signature text,
  ADD COLUMN certificate_athletics_name text CHECK (certificate_athletics_name IS NULL OR char_length(certificate_athletics_name) BETWEEN 1 AND 80),
  ADD COLUMN certificate_athletics_signature text;

-- A released certificate without the three signatures is not valid.
UPDATE public.events
SET certificate_enabled = false
WHERE certificate_enabled
  AND (
    certificate_da_signature IS NULL
    OR certificate_coordinator_signature IS NULL
    OR certificate_athletics_signature IS NULL
  );

CREATE FUNCTION public.apply_certificate_release()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  releasing boolean;
  tpl public.certificate_template%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    releasing := NEW.certificate_enabled;
  ELSE
    releasing := NEW.certificate_enabled AND NOT OLD.certificate_enabled;
  END IF;

  IF releasing THEN
    SELECT * INTO tpl FROM public.certificate_template LIMIT 1;
    IF NOT FOUND
       OR nullif(trim(tpl.da_name), '') IS NULL
       OR nullif(trim(tpl.da_signature), '') IS NULL
       OR nullif(trim(tpl.coordinator_name), '') IS NULL
       OR nullif(trim(tpl.coordinator_signature), '') IS NULL
       OR nullif(trim(tpl.athletics_name), '') IS NULL
       OR nullif(trim(tpl.athletics_signature), '') IS NULL
    THEN
      RAISE EXCEPTION 'certificate_signers_missing' USING ERRCODE = '23514';
    END IF;
    NEW.certificate_da_name := trim(tpl.da_name);
    NEW.certificate_da_signature := tpl.da_signature;
    NEW.certificate_coordinator_name := trim(tpl.coordinator_name);
    NEW.certificate_coordinator_signature := tpl.coordinator_signature;
    NEW.certificate_athletics_name := trim(tpl.athletics_name);
    NEW.certificate_athletics_signature := tpl.athletics_signature;
  END IF;

  IF NEW.certificate_enabled AND (
    NEW.certificate_complementary_hours IS NULL
    OR NEW.certificate_mandatory_hours IS NULL
    OR nullif(trim(NEW.certificate_da_name), '') IS NULL
    OR nullif(trim(NEW.certificate_da_signature), '') IS NULL
    OR nullif(trim(NEW.certificate_coordinator_name), '') IS NULL
    OR nullif(trim(NEW.certificate_coordinator_signature), '') IS NULL
    OR nullif(trim(NEW.certificate_athletics_name), '') IS NULL
    OR nullif(trim(NEW.certificate_athletics_signature), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'certificate_not_ready' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER events_certificate_release
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.apply_certificate_release();

CREATE OR REPLACE FUNCTION public.issue_certificate(_event_id uuid, _email text, _ra text, _year int, _hour_type text)
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

  IF nullif(trim(ev.certificate_da_name), '') IS NULL
     OR nullif(trim(ev.certificate_da_signature), '') IS NULL
     OR nullif(trim(ev.certificate_coordinator_name), '') IS NULL
     OR nullif(trim(ev.certificate_coordinator_signature), '') IS NULL
     OR nullif(trim(ev.certificate_athletics_name), '') IS NULL
     OR nullif(trim(ev.certificate_athletics_signature), '') IS NULL
  THEN
    RETURN jsonb_build_object('status', 'signatures_missing');
  END IF;

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
    'hour_type', kind,
    'signers', jsonb_build_array(
      jsonb_build_object('role', 'Presidente do DA', 'name', ev.certificate_da_name, 'signature_url', ev.certificate_da_signature),
      jsonb_build_object('role', 'Coordenador', 'name', ev.certificate_coordinator_name, 'signature_url', ev.certificate_coordinator_signature),
      jsonb_build_object('role', 'Presidente da Atlética', 'name', ev.certificate_athletics_name, 'signature_url', ev.certificate_athletics_signature)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.issue_certificate(uuid, text, text, int, text) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, text, text, int, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_admin_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  email text;
  act text;
  area text;
  entity uuid;
  summary text;
  label text;
  event_title text;
  fresh jsonb;
  previous jsonb;
BEGIN
  IF uid IS NULL OR auth.role() = 'service_role' OR auth.role() = 'anon' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  fresh := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  previous := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  IF TG_OP = 'UPDATE' AND (fresh - 'updated_at' - 'sort_order') = (previous - 'updated_at' - 'sort_order') THEN
    RETURN NEW;
  END IF;

  SELECT u.email::text INTO email FROM auth.users u WHERE u.id = uid;
  entity := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  act := CASE TG_OP WHEN 'INSERT' THEN 'criou' WHEN 'DELETE' THEN 'excluiu' ELSE 'editou' END;

  IF TG_TABLE_NAME = 'events' THEN
    area := 'evento'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    IF TG_OP = 'UPDATE' AND NEW.certificate_enabled IS DISTINCT FROM OLD.certificate_enabled THEN
      summary := CASE WHEN NEW.certificate_enabled THEN 'liberou o certificado do evento ' ELSE 'retirou o certificado do evento ' END || label;
    ELSE
      summary := act || ' o evento ' || label;
    END IF;
  ELSIF TG_TABLE_NAME = 'products' THEN
    area := 'produto'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    summary := act || ' o produto ' || label;
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    area := 'aviso'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.title ELSE NEW.title END;
    summary := act || ' o aviso ' || label;
  ELSIF TG_TABLE_NAME = 'board_members' THEN
    area := 'membro'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.name ELSE NEW.name END;
    IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id
       AND (fresh - 'updated_at' - 'sort_order' - 'user_id') = (previous - 'updated_at' - 'sort_order' - 'user_id') THEN
      summary := CASE WHEN NEW.user_id IS NULL THEN 'removeu o acesso de ' ELSE 'vinculou um acesso a ' END || label;
    ELSE
      summary := act || ' o membro ' || label;
    END IF;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    area := 'pedido'; label := CASE WHEN TG_OP = 'DELETE' THEN OLD.code ELSE NEW.code END;
    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      summary := 'alterou o pedido ' || label || ' para ' || public.order_status_label(NEW.status);
    ELSE
      summary := act || ' o pedido ' || label;
    END IF;
  ELSIF TG_TABLE_NAME = 'registrations' THEN
    area := 'inscricao';
    SELECT e.title INTO event_title FROM public.events e
      WHERE e.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
    label := CASE WHEN TG_OP = 'DELETE' THEN OLD.full_name ELSE NEW.full_name END;
    IF TG_OP = 'UPDATE' AND NEW.checked_in_at IS DISTINCT FROM OLD.checked_in_at THEN
      summary := CASE WHEN NEW.checked_in_at IS NULL THEN 'removeu a presença de ' ELSE 'marcou a presença de ' END
        || label || COALESCE(' em ' || event_title, '');
    ELSIF TG_OP = 'DELETE' THEN
      summary := 'removeu a inscrição de ' || label || COALESCE(' em ' || event_title, '');
    ELSE
      summary := act || ' a inscrição de ' || label || COALESCE(' em ' || event_title, '');
    END IF;
  ELSIF TG_TABLE_NAME = 'event_photos' THEN
    area := 'evento';
    SELECT e.title INTO event_title FROM public.events e
      WHERE e.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
    act := CASE WHEN TG_OP = 'DELETE' THEN 'excluiu' ELSE 'criou' END;
    summary := CASE WHEN TG_OP = 'DELETE' THEN 'removeu uma foto do evento ' ELSE 'adicionou uma foto ao evento ' END
      || COALESCE(event_title, '');
  ELSIF TG_TABLE_NAME = 'certificate_template' THEN
    area := 'evento';
    summary := 'editou o modelo do certificado';
  ELSE
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  INSERT INTO public.activity_log (actor_id, actor_email, action, area, entity_id, summary)
  VALUES (uid, email, act, area, entity, left(summary, 300));

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER certificate_template_audit
  AFTER UPDATE ON public.certificate_template
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
