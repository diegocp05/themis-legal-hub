// src/components/admin/settings-admin.tsx
import React, { useState, useEffect } from "react";
import { Save, RefreshCw, CheckCircle2, AlertCircle, Settings } from "lucide-react";
import { useSiteSettings, SiteSettingRow } from "@/hooks/useSiteSettings";

const CATEGORY_LABELS: Record<string, string> = {
  geral: "Gestão & Identidade",
  contato: "Canais de Contato",
  financeiro: "Tesouraria & PIX",
  transparencia: "Documentos & Transparência",
};

export function SettingsAdmin() {
  const { rows, loading, error, refetch, updateSetting } = useSiteSettings();
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    rows.forEach((row) => {
      initial[row.key] = row.value;
    });
    setFormValues(initial);
  }, [rows]);

  const handleSave = async (row: SiteSettingRow) => {
    const newValue = formValues[row.key] ?? "";
    if (newValue === row.value) return;

    try {
      setSavingKey(row.key);
      setFeedbackError(null);
      await updateSetting(row.key, newValue);
      setSavedKey(row.key);
      setTimeout(() => setSavedKey((prev) => (prev === row.key ? null : prev)), 2500);
    } catch (err: any) {
      setFeedbackError(err?.message || `Erro ao salvar "${row.label}"`);
    } finally {
      setSavingKey(null);
    }
  };

  const grouped = rows.reduce<Record<string, SiteSettingRow[]>>((acc, row) => {
    const cat = row.category || "geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {});

  if (loading && rows.length === 0) {
    return (
      <div className="mt-6 flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="mr-2 size-5 animate-spin text-gold" />
        <span>Carregando configurações da gestão...</span>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 pb-8">
      {/* Cabeçalho Mobile-First */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-gold">
            <Settings className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold sm:text-xl">Configurações da Gestão</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Altere dados oficiais, PIX e links do Diretório sem mexer no código.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 self-stretch rounded-lg border border-border bg-muted/60 px-4 text-sm font-semibold transition-colors hover:bg-muted sm:self-auto"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {(error || feedbackError) && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0" />
          <span>{feedbackError || error}</span>
        </div>
      )}

      {/* Cards por Categoria (1 coluna no mobile, 2 no desktop) */}
      {Object.entries(grouped).map(([category, items]) => (
        <section
          key={category}
          className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <h3 className="border-b border-border pb-2.5 text-base font-bold text-gold">
            {CATEGORY_LABELS[category] || category.toUpperCase()}
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((row) => {
              const currentValue = formValues[row.key] ?? "";
              const isDirty = currentValue !== row.value;
              const isSaving = savingKey === row.key;
              const isSaved = savedKey === row.key;

              return (
                <div
                  key={row.key}
                  className="flex flex-col justify-between space-y-3 rounded-lg border border-border bg-muted/30 p-3.5"
                >
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`setting-${row.key}`}
                      className="block text-sm font-semibold text-foreground"
                    >
                      {row.label}
                    </label>
                    <input
                      id={`setting-${row.key}`}
                      type="text"
                      value={currentValue}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [row.key]: e.target.value }))
                      }
                      className="min-h-[44px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-xs text-muted-foreground">{row.key}</span>

                    <button
                      type="button"
                      disabled={!isDirty || isSaving}
                      onClick={() => handleSave(row)}
                      className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-bold transition-all ${
                        isSaved
                          ? "bg-emerald-600 text-white"
                          : isDirty
                          ? "bg-primary text-gold hover:opacity-90 active:scale-[0.99]"
                          : "cursor-not-allowed bg-muted text-muted-foreground"
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle2 className="size-4" />
                          Salvo
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          {isSaving ? "Salvando..." : "Salvar"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default SettingsAdmin;