-- Logo shown in the header, login and browser icon. Empty keeps the gold scales.
INSERT INTO public.page_content (key, value) VALUES ('site_logo', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.save_page_content(_entries jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  k text;
  v text;
  previous text;
  changed text[] := '{}';
  uid uuid := auth.uid();
  email text;
  summary text;
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF jsonb_typeof(_entries) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid'; END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(_entries) LOOP
    k := item->>'key';
    v := left(COALESCE(item->>'value', ''), 800);
    IF k NOT IN (
      'site_logo', 'site_name', 'site_tagline', 'home_badge', 'home_title', 'home_text', 'home_store_label', 'home_store_title',
      'home_members_label', 'home_members_title', 'home_members_text', 'home_notice_label', 'fallback_image',
      'events_label', 'events_title', 'events_text', 'events_empty', 'events_certificate_title', 'events_certificate_text', 'events_past_title',
      'products_label', 'products_title', 'products_text', 'products_empty',
      'certificates_title', 'certificates_text', 'certificates_empty'
    ) THEN CONTINUE; END IF;

    SELECT value INTO previous FROM public.page_content WHERE key = k;
    IF previous IS NULL THEN
      INSERT INTO public.page_content (key, value) VALUES (k, v);
    ELSIF previous IS DISTINCT FROM v THEN
      UPDATE public.page_content SET value = v, updated_at = now() WHERE key = k;
    ELSE
      CONTINUE;
    END IF;
    changed := changed || CASE k
      WHEN 'site_logo' THEN 'logo do site'
      WHEN 'site_name' THEN 'nome do site'
      WHEN 'site_tagline' THEN 'linha do topo'
      WHEN 'home_badge' THEN 'selo da home'
      WHEN 'home_title' THEN 'título da home'
      WHEN 'home_text' THEN 'texto da home'
      WHEN 'home_store_label' THEN 'chamada da loja na home'
      WHEN 'home_store_title' THEN 'título da loja na home'
      WHEN 'home_members_label' THEN 'gestão'
      WHEN 'home_members_title' THEN 'título dos membros'
      WHEN 'home_members_text' THEN 'texto dos membros'
      WHEN 'home_notice_label' THEN 'rótulo dos avisos'
      WHEN 'fallback_image' THEN 'imagem padrão'
      WHEN 'events_label' THEN 'chamada de eventos'
      WHEN 'events_title' THEN 'título de eventos'
      WHEN 'events_text' THEN 'texto de eventos'
      WHEN 'events_empty' THEN 'aviso sem eventos'
      WHEN 'events_certificate_title' THEN 'título do certificado na agenda'
      WHEN 'events_certificate_text' THEN 'texto do certificado na agenda'
      WHEN 'events_past_title' THEN 'título dos eventos passados'
      WHEN 'products_label' THEN 'chamada da loja'
      WHEN 'products_title' THEN 'título da loja'
      WHEN 'products_text' THEN 'texto da loja'
      WHEN 'products_empty' THEN 'aviso sem produtos'
      WHEN 'certificates_title' THEN 'título dos certificados'
      WHEN 'certificates_text' THEN 'texto dos certificados'
      WHEN 'certificates_empty' THEN 'aviso sem certificados'
      ELSE k
    END;
  END LOOP;

  IF cardinality(changed) = 0 THEN RETURN; END IF;
  SELECT u.email::text INTO email FROM auth.users u WHERE u.id = uid;
  summary := left('editou as páginas: ' || array_to_string(changed, ', '), 300);
  INSERT INTO public.activity_log (actor_id, actor_email, action, area, summary)
  VALUES (uid, email, 'editou', 'pagina', summary);
END;
$$;
