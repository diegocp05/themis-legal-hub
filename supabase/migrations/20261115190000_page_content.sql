-- Editable copy and the fallback image for the public pages.
CREATE TABLE public.page_content (
  key text PRIMARY KEY CHECK (key ~ '^[a-z_]+$'),
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.page_content (key, value) VALUES
  ('site_logo', ''),
  ('site_name', 'Sistema Themis'),
  ('site_tagline', 'Diretório Acadêmico de Direito'),
  ('home_badge', 'Diretório Acadêmico'),
  ('home_title', 'Portal do Direito'),
  ('home_text', 'Eventos, produtos oficiais e avisos do DA em um só lugar.'),
  ('home_store_label', 'Loja do DA'),
  ('home_store_title', 'Destaques institucionais'),
  ('home_members_label', 'Gestão 2026'),
  ('home_members_title', 'Quem faz o DA acontecer'),
  ('home_members_text', 'Conheça a chapa diretora responsável pelos produtos, eventos e pela representação dos estudantes.'),
  ('home_notice_label', 'Aviso importante'),
  ('fallback_image', ''),
  ('events_label', 'Agenda do DA'),
  ('events_title', 'Eventos'),
  ('events_text', 'Todas as inscrições são gratuitas. Escolha um evento e garanta sua vaga.'),
  ('events_empty', 'Nenhum evento programado no momento. Fique de olho nos avisos do DA!'),
  ('events_certificate_title', 'Foi num evento?'),
  ('events_certificate_text', 'Baixe o certificado com o e-mail e o RA da inscrição.'),
  ('events_past_title', 'Já rolou'),
  ('products_label', 'Loja oficial'),
  ('products_title', 'Produtos sob encomenda'),
  ('products_text', 'Escolha seu modelo e tamanho. Produzimos cada lote após o encerramento das encomendas.'),
  ('products_empty', 'Nenhum produto disponível no momento. Volte em breve!'),
  ('certificates_title', 'Emita seu certificado'),
  ('certificates_text', 'Disponível para quem teve a presença confirmada no evento. Use o mesmo e-mail e RA da inscrição.'),
  ('certificates_empty', 'Nenhum certificado disponível no momento.');

ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads page content" ON public.page_content FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.page_content TO anon, authenticated;
GRANT ALL ON public.page_content TO service_role;

ALTER TABLE public.activity_log DROP CONSTRAINT activity_log_area_check;
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_area_check
  CHECK (area IN ('evento', 'produto', 'aviso', 'pedido', 'membro', 'acesso', 'inscricao', 'pagina'));

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

REVOKE ALL ON FUNCTION public.save_page_content(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_page_content(jsonb) TO authenticated;
