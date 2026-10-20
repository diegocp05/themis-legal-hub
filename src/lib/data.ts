import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EventRow = Tables<"events">;
export type ScheduleRow = Tables<"event_schedule">;
export type ProductRow = Tables<"products">;
export type AnnouncementRow = Tables<"announcements">;
export type RegistrationRow = Tables<"registrations">;
export type OrderRow = Tables<"orders">;
export type BoardMemberRow = Tables<"board_members">;

export function usePublishedEvents() {
  return useQuery({
    queryKey: ["events", "published"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("published", true).order("starts_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ["events", "slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*, event_schedule(*)").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { event_schedule, ...event } = data;
      return { event, schedule: [...event_schedule].sort((a, b) => a.sort_order - b.sort_order) };
    },
  });
}

export function useSpotsTaken(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", "spots", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("event_spots_taken", { _event_id: eventId! });
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active", true).order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements", "published"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBoardMembers() {
  return useQuery({
    queryKey: ["board-members", "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("board_members").select("*").eq("active", true).order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

/** Featured upcoming event first, otherwise the next upcoming one. */
export function pickHighlight(events: EventRow[]) {
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.ends_at ?? e.starts_at).getTime() >= now);
  return upcoming.find((e) => e.featured) ?? upcoming[0] ?? null;
}

export const hasEnded = (event: Pick<EventRow, "starts_at" | "ends_at">) => new Date(event.ends_at ?? event.starts_at).getTime() < Date.now();

export function isRegistrationOpen(event: EventRow) {
  const deadlinePassed = event.registration_closes_at != null && new Date(event.registration_closes_at).getTime() <= Date.now();
  return event.registration_open && !deadlinePassed && !hasEnded(event);
}

export type EventCategory = EventRow["category"];
export const eventCategories: { id: EventCategory; label: string }[] = [
  { id: "faculdade", label: "Palestras e faculdade" },
  { id: "festa", label: "Festas" },
  { id: "esporte", label: "Esportes" },
  { id: "outro", label: "Outros" },
];
export const categoryLabel = (c: EventCategory) => eventCategories.find((x) => x.id === c)?.label ?? c;

export type ProductStatus = ProductRow["status"];
export const productStatusLabel: Record<ProductStatus, string> = { disponivel: "Disponível", esgotado: "Esgotado", em_breve: "Em breve" };

/** Ended events whose certificate is released. */
export function useCertificateEvents() {
  return useQuery({
    queryKey: ["events", "certificates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id, slug, title, starts_at, ends_at, certificate_hours")
        .eq("published", true).eq("certificate_enabled", true).lte("starts_at", new Date().toISOString()).order("starts_at", { ascending: false });
      if (error) throw error;
      return data.filter(hasEnded);
    },
  });
}

/** Groups members by sector, keeping sectors in the order their first member appears. */
export function groupBySector<T extends { sector: string }>(members: T[]) {
  const groups = new Map<string, T[]>();
  for (const m of members) groups.set(m.sector, [...(groups.get(m.sector) ?? []), m]);
  return [...groups.entries()].map(([sector, items]) => ({ sector, items }));
}

export function formatEventDays(event: Pick<EventRow, "starts_at" | "ends_at">) {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  if (!end || isSameDay(start, end)) return format(start, "d 'de' MMMM", { locale: ptBR });
  if (isSameMonth(start, end)) return `${format(start, "d")}–${format(end, "d 'de' MMMM", { locale: ptBR })}`;
  return `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM", { locale: ptBR })}`;
}

export function formatEventHours(event: Pick<EventRow, "starts_at" | "ends_at">) {
  const hour = (d: Date) => (d.getMinutes() ? format(d, "H'h'mm") : format(d, "H'h'"));
  const start = new Date(event.starts_at);
  return event.ends_at ? `${hour(start)} às ${hour(new Date(event.ends_at))}` : hour(start);
}

export const formatDateTime = (value: string) => format(new Date(value), "dd/MM/yyyy HH:mm");

export const slugify = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export type MediaFolder = "events" | "products" | "board";

export async function uploadMedia(file: File, folder: MediaFolder) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
