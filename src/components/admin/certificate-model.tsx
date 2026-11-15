import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { blankCertificate, downloadCertificate, templateSigners, type CertificateTemplateFields } from "@/lib/certificate";
import { ErrorNote, Field, ImageInput, Panel, inputClass } from "./form";

export function useCertificateTemplate() {
  return useQuery({
    queryKey: ["admin", "certificate-template"],
    queryFn: async () => {
      const { data, error } = await supabase.from("certificate_template").select("id, da_name, da_signature, coordinator_name, coordinator_signature, athletics_name, athletics_signature, updated_at").limit(1).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("missing template");
      return data;
    },
  });
}

const slots = [
  { role: "Presidente do DA", name: "da_name", signature: "da_signature" },
  { role: "Coordenador", name: "coordinator_name", signature: "coordinator_signature" },
  { role: "Presidente da Atlética", name: "athletics_name", signature: "athletics_signature" },
] as const;

type SlotName = (typeof slots)[number]["name"];
type SlotSignature = (typeof slots)[number]["signature"];

export function CertificateModel({ onBack }: { onBack: () => void }) {
  const { data, isLoading, isError } = useCertificateTemplate();
  return <Panel title="Modelo do certificado" subtitle="Certificado em branco. As três assinaturas entram antes de liberar o evento para os alunos." action={<Button variant="outline" onClick={onBack}><ArrowLeft /> Voltar</Button>}>
    {isLoading && <div className="p-5"><div className="h-64 animate-pulse rounded-lg bg-muted" /></div>}
    {isError && <p className="p-5 text-sm text-destructive">Não foi possível abrir o modelo.</p>}
    {data && <CertificateForm key={data.updated_at} template={data} />}
  </Panel>;
}

function CertificateForm({ template }: { template: CertificateTemplateFields & { id: string } }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState({
    da_name: template.da_name ?? "",
    da_signature: template.da_signature,
    coordinator_name: template.coordinator_name ?? "",
    coordinator_signature: template.coordinator_signature,
    athletics_name: template.athletics_name ?? "",
    athletics_signature: template.athletics_signature,
  });
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const signers = templateSigners(v);
  const ready = signers.every((signer) => signer.name.length > 0 && !!signer.signature_url);
  const setName = (key: SlotName, value: string) => { setSaved(false); setV((cur) => ({ ...cur, [key]: value })); };
  const setSignature = (key: SlotSignature, value: string | null) => { setSaved(false); setV((cur) => ({ ...cur, [key]: value })); };

  const save = async () => {
    setBusy(true); setError(""); setSaved(false);
    const payload = {
      da_name: v.da_name.trim() || null,
      da_signature: v.da_signature,
      coordinator_name: v.coordinator_name.trim() || null,
      coordinator_signature: v.coordinator_signature,
      athletics_name: v.athletics_name.trim() || null,
      athletics_signature: v.athletics_signature,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from("certificate_template").update(payload).eq("id", template.id);
    setBusy(false);
    if (saveError) return setError(saveError.code === "23514" ? "Cada nome pode ter no máximo 80 caracteres." : "Não foi possível salvar o modelo.");
    setSaved(true);
    queryClient.invalidateQueries({ queryKey: ["admin", "certificate-template"] });
  };

  const preview = async () => {
    setPreviewing(true); setError("");
    try { await downloadCertificate(blankCertificate(signers)); }
    catch { setError("Não foi possível gerar a prévia. Tente novamente."); }
    setPreviewing(false);
  };

  return <>
    <div className="grid gap-4 border-b border-border p-5 lg:grid-cols-3">
      {slots.map((slot) => <div key={slot.role} className="grid content-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Field label={slot.role} hint="Nome como deve sair no certificado">
          <input maxLength={80} value={v[slot.name]} onChange={(e) => setName(slot.name, e.target.value)} placeholder="Nome completo" className={inputClass} />
        </Field>
        <ImageInput label="Assinatura" fit="contain" folder="signatures" value={v[slot.signature]} onChange={(url) => setSignature(slot.signature, url)} />
        <p className="-mt-1 text-xs text-muted-foreground">PNG ou JPG, de preferência em fundo branco.</p>
      </div>)}
    </div>
    <div className="grid gap-4 p-5">
      <div className="flex items-center gap-2"><Award size={16} className="text-gold" /><h3 className="font-bold">Prévia do modelo</h3></div>
      <p className="text-xs text-muted-foreground">Os dados abaixo são de exemplo. No certificado do aluno entram o nome, o RA, o evento e as horas escolhidas.</p>
      <CertificatePreview signers={signers} />
      <p className={`rounded-lg p-3 text-xs font-bold ${ready ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
        {ready ? "As três assinaturas estão no modelo. Salve e, no evento, marque Emitir certificado para presentes." : "Falta nome ou assinatura. Sem as três assinaturas o certificado não vale e o aluno não consegue baixar."}
      </p>
      {saved && <p className="rounded-lg bg-success-soft p-3 text-xs font-bold text-success">Modelo salvo.</p>}
      <ErrorNote text={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={busy}>{busy ? "Salvando..." : "Salvar modelo"}</Button>
        <Button type="button" variant="outline" onClick={preview} disabled={previewing}><Download /> {previewing ? "Gerando..." : "Baixar prévia"}</Button>
      </div>
    </div>
  </>;
}

function CertificatePreview({ signers }: { signers: ReturnType<typeof templateSigners> }) {
  return <div className="overflow-hidden rounded-xl bg-neutral-900 p-3 sm:p-4">
    <div className="bg-white px-4 py-5 text-center text-neutral-900 ring-1 ring-gold sm:px-8">
      <p className="text-[10px] font-bold tracking-[0.22em] text-gold">DIRETÓRIO ACADÊMICO DE DIREITO</p>
      <h3 className="mt-2 font-serif text-2xl font-bold tracking-[0.18em] sm:text-3xl">CERTIFICADO</h3>
      <div className="mx-auto mt-2 h-0.5 w-20 bg-gold" />
      <p className="mt-4 text-xs text-neutral-500">Certificamos que</p>
      <p className="mt-1 font-serif text-xl font-bold sm:text-2xl">Nome do aluno</p>
      <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed">participou do evento “Nome do evento”, realizado em 3–6 de novembro de 2026, em Local do evento, com carga horária de 10 horas complementares.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        {signers.map((signer) => <div key={signer.role} className="grid justify-items-center">
          <span className="grid h-12 w-full place-items-center">{signer.signature_url ? <img src={signer.signature_url} alt="" className="max-h-12 max-w-full object-contain" /> : <span className="text-[10px] text-neutral-300">Assinatura</span>}</span>
          <span className="mt-1 h-px w-full max-w-28 bg-neutral-800" />
          <span className="mt-1 max-w-full truncate text-[11px] font-bold">{signer.name || "Nome"}</span>
          <span className="text-[10px] text-neutral-500">{signer.role}</span>
        </div>)}
      </div>
      <p className="mt-4 text-[10px] text-neutral-400">RA 0000000</p>
    </div>
  </div>;
}
