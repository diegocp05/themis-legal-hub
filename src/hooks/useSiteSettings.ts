// src/hooks/useSiteSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettingRow {
  key: string;
  value: string;
  label: string;
  category: string;
  updated_at?: string;
}

export interface SiteSettingsMap {
  whatsapp_number: string;
  instagram_url: string;
  contact_email: string;
  pix_key: string;
  pix_beneficiary: string;
  statute_url: string;
  current_management: string;
  [key: string]: string;
}

const DEFAULT_SETTINGS: SiteSettingsMap = {
  whatsapp_number: '5516999999999',
  instagram_url: 'https://instagram.com/dadireito',
  contact_email: 'contato@dadireito.org.br',
  pix_key: '00.000.000/0001-00',
  pix_beneficiary: 'Diretório Acadêmico de Direito',
  statute_url: '#',
  current_management: 'Gestão 2026 - Têmis',
};

let cachedSettings: SiteSettingsMap | null = null;
let cachedRows: SiteSettingRow[] | null = null;

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettingsMap>(cachedSettings || DEFAULT_SETTINGS);
  const [rows, setRows] = useState<SiteSettingRow[]>(cachedRows || []);
  const [loading, setLoading] = useState<boolean>(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    if (cachedSettings && !forceRefresh) {
      setSettings(cachedSettings);
      if (cachedRows) setRows(cachedRows);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Cast pontual enquanto site_settings não entra no types.ts gerado do Supabase
      const { data, error: sbError } = await (supabase as any)
        .from('site_settings')
        .select('key, value, label, category, updated_at')
        .order('category', { ascending: true });

      if (sbError) throw sbError;

      const typedData = (data ?? []) as SiteSettingRow[];

      if (typedData.length > 0) {
        const mapped: SiteSettingsMap = { ...DEFAULT_SETTINGS };
        typedData.forEach((item) => {
          mapped[item.key] = item.value;
        });

        cachedSettings = mapped;
        cachedRows = typedData;
        setSettings(mapped);
        setRows(typedData);
      }
    } catch (err: any) {
      console.error('Erro ao carregar site_settings:', err);
      setError(err?.message || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (key: string, newValue: string) => {
    const { error: updateError } = await (supabase as any)
      .from('site_settings')
      .update({ value: newValue, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (updateError) throw updateError;

    await fetchSettings(true);
  };

  return {
    settings,
    rows,
    loading,
    error,
    refetch: () => fetchSettings(true),
    updateSetting,
  };
}