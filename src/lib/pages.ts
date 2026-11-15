import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const pageFields = [
  { key: "site_logo", group: "Topo do site", label: "Logo", long: false, image: true, hint: "Foto do topo, do login e do ícone do navegador. Sem foto, continua a balança dourada." },
  { key: "site_name", group: "Topo do site", label: "Nome", long: false },
  { key: "site_tagline", group: "Topo do site", label: "Linha abaixo do nome", long: false },
  { key: "fallback_image", group: "Topo do site", label: "Imagem padrão", long: false, image: true, hint: "Aparece na home quando não há evento em destaque, e nos eventos que não têm foto." },
  { key: "home_badge", group: "Página inicial", label: "Selo, quando não há evento", long: false },
  { key: "home_title", group: "Página inicial", label: "Título, quando não há evento", long: false },
  { key: "home_text", group: "Página inicial", label: "Texto, quando não há evento", long: true },
  { key: "home_store_label", group: "Página inicial", label: "Chamada da loja", long: false },
  { key: "home_store_title", group: "Página inicial", label: "Título da loja", long: false },
  { key: "home_members_label", group: "Página inicial", label: "Gestão", long: false },
  { key: "home_members_title", group: "Página inicial", label: "Título dos membros", long: false },
  { key: "home_members_text", group: "Página inicial", label: "Texto dos membros", long: true },
  { key: "home_notice_label", group: "Página inicial", label: "Rótulo dos avisos", long: false },
  { key: "events_label", group: "Eventos", label: "Chamada", long: false },
  { key: "events_title", group: "Eventos", label: "Título", long: false },
  { key: "events_text", group: "Eventos", label: "Texto", long: true },
  { key: "events_empty", group: "Eventos", label: "Aviso quando não há evento", long: true },
  { key: "events_certificate_title", group: "Eventos", label: "Título do atalho de certificado", long: false },
  { key: "events_certificate_text", group: "Eventos", label: "Texto do atalho de certificado", long: true },
  { key: "events_past_title", group: "Eventos", label: "Título dos eventos passados", long: false },
  { key: "products_label", group: "Produtos", label: "Chamada", long: false },
  { key: "products_title", group: "Produtos", label: "Título", long: false },
  { key: "products_text", group: "Produtos", label: "Texto", long: true },
  { key: "products_empty", group: "Produtos", label: "Aviso quando não há produto", long: true },
  { key: "certificates_title", group: "Certificados", label: "Título", long: false },
  { key: "certificates_text", group: "Certificados", label: "Texto", long: true },
  { key: "certificates_empty", group: "Certificados", label: "Aviso quando não há certificado", long: true },
] as const;

export type PageKey = (typeof pageFields)[number]["key"];

export const pageDefaults: Record<PageKey, string> = {
  site_logo: "",
  site_name: "Sistema Themis",
  site_tagline: "Diretório Acadêmico de Direito",
  fallback_image: "",
  home_badge: "Diretório Acadêmico",
  home_title: "Portal do Direito",
  home_text: "Eventos, produtos oficiais e avisos do DA em um só lugar.",
  home_store_label: "Loja do DA",
  home_store_title: "Destaques institucionais",
  home_members_label: "Gestão 2026",
  home_members_title: "Quem faz o DA acontecer",
  home_members_text: "Conheça a chapa diretora responsável pelos produtos, eventos e pela representação dos estudantes.",
  home_notice_label: "Aviso importante",
  events_label: "Agenda do DA",
  events_title: "Eventos",
  events_text: "Todas as inscrições são gratuitas. Escolha um evento e garanta sua vaga.",
  events_empty: "Nenhum evento programado no momento. Fique de olho nos avisos do DA!",
  events_certificate_title: "Foi num evento?",
  events_certificate_text: "Baixe o certificado com o e-mail e o RA da inscrição.",
  events_past_title: "Já rolou",
  products_label: "Loja oficial",
  products_title: "Produtos sob encomenda",
  products_text: "Escolha seu modelo e tamanho. Produzimos cada lote após o encerramento das encomendas.",
  products_empty: "Nenhum produto disponível no momento. Volte em breve!",
  certificates_title: "Emita seu certificado",
  certificates_text: "Disponível para quem teve a presença confirmada no evento. Use o mesmo e-mail e RA da inscrição.",
  certificates_empty: "Nenhum certificado disponível no momento.",
};

export function pageText(content: Record<PageKey, string> | undefined, key: PageKey) {
  if (key === "fallback_image" || key === "site_logo") return content?.[key]?.trim() ?? "";
  return content?.[key]?.trim() || pageDefaults[key];
}

export async function fetchPageContent() {
  const { data, error } = await supabase.from("page_content").select("key, value");
  if (error) throw error;
  const content = { ...pageDefaults };
  for (const row of data) {
    if (row.key in content) content[row.key as PageKey] = row.value;
  }
  return content;
}

export type PageContentPayload = { content: Record<PageKey, string>; fetchedAt: number };

function isPageContentPayload(value: unknown): value is PageContentPayload {
  if (!value || typeof value !== "object" || !("content" in value) || !("fetchedAt" in value)) return false;
  const content = (value as { content: unknown }).content;
  return !!content && typeof content === "object" && "site_logo" in content && "site_name" in content;
}

export function usePageContent() {
  const payload = useRouterState({
    select: (state) => state.matches.map((match) => match.loaderData).find(isPageContentPayload),
  });
  return useQuery({
    queryKey: ["page-content"],
    queryFn: fetchPageContent,
    staleTime: 30_000,
    ...(payload ? { initialData: payload.content, initialDataUpdatedAt: payload.fetchedAt } : {}),
  });
}
