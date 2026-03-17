import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import React from 'react';
import { Database, Shield, Users, HardDrive, Code, Table2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────
export interface ExportSection {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  actions: string[];
  step: number;
  migrationNote: string;
}

export interface ExportProgress {
  current: number;
  total: number;
  label: string;
}

// ─── Constants ───────────────────────────────────────────────────────
export const EXPORT_SECTIONS: ExportSection[] = [
  { id: 'schema', label: 'Estrutura do Banco (Schema)', icon: Database, description: 'ENUMs, CREATE TABLE, PKs, FKs e índices', actions: ['schema', 'primary-keys', 'foreign-keys', 'indexes', 'enums'], step: 1, migrationNote: 'Execute primeiro no SQL Editor do novo projeto' },
  { id: 'functions', label: 'Funções e Triggers', icon: Code, description: 'Funções PL/pgSQL (is_super_admin, has_role, etc.) e triggers', actions: ['db-functions', 'triggers'], step: 2, migrationNote: 'Devem existir ANTES das RLS policies' },
  { id: 'rls', label: 'RLS Policies', icon: Shield, description: 'Enable RLS + todas as policies de segurança', actions: ['rls-policies', 'rls-status'], step: 3, migrationNote: 'Depende das funções do passo 2' },
  { id: 'storage', label: 'Storage (Buckets & Policies)', icon: HardDrive, description: 'Buckets de storage e suas políticas de acesso', actions: ['storage-buckets', 'storage-policies'], step: 4, migrationNote: 'Arquivos dentro dos buckets NÃO são migrados' },
  { id: 'data', label: 'Dados das Tabelas (filtrado)', icon: Table2, description: 'Dados estruturais + amostras limitadas de conversas e leads', actions: ['list-tables', 'table-data'], step: 5, migrationNote: 'INSERTs filtrados — apenas dados essenciais' },
  { id: 'users', label: 'Usuários (Auth)', icon: Users, description: 'Metadados dos usuários autenticados (sem senhas)', actions: ['users-list'], step: 6, migrationNote: 'Senhas NÃO podem ser exportadas' },
];

const EXCLUDED_DATA_TABLES = [
  'contacts', 'broadcast_logs', 'instance_connection_logs',
  'scheduled_message_logs', 'shift_report_logs',
  'conversation_labels', 'kanban_cards', 'kanban_card_data',
];

const LIMITED_DATA_TABLES: Record<string, number> = {
  'conversation_messages': 5, 'conversations': 5, 'lead_database_entries': 30,
};

// ─── Helpers ─────────────────────────────────────────────────────────
const escapeSQL = (val: any): string => {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
};

export const formatKB = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Hook ────────────────────────────────────────────────────────────
export function useBackupExport() {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(EXPORT_SECTIONS.map(s => s.id))
  );
  const [format, setFormat] = useState<'sql' | 'csv'>('sql');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [sectionSizes, setSectionSizes] = useState<Record<string, number>>({});
  const [totalSize, setTotalSize] = useState(0);

  const toggleSection = useCallback((id: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelectedSections(new Set(EXPORT_SECTIONS.map(s => s.id))), []);
  const selectNone = useCallback(() => setSelectedSections(new Set()), []);

  const callBackupApi = async (action: string, tableName?: string, limit?: number) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, table_name: tableName, limit }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro na API'); }
    return (await res.json()).data || [];
  };

  const generateSQL = useCallback(async () => {
    const sectionBlocks: Record<string, string[]> = {};
    const hasSchema = selectedSections.has('schema');
    const hasData = selectedSections.has('data');
    const hasRls = selectedSections.has('rls');
    const hasFunctions = selectedSections.has('functions');
    const hasUsers = selectedSections.has('users');
    const hasStorage = selectedSections.has('storage');

    let totalSteps = 0;
    if (hasSchema) totalSteps++;
    if (hasFunctions) totalSteps++;
    if (hasRls) totalSteps++;
    if (hasStorage) totalSteps++;
    if (hasData) totalSteps += 2;
    if (hasUsers) totalSteps++;
    let stepsDone = 0;

    const header = [
      '-- ═══════════════════════════════════════════════════════════',
      '-- WsmartQR Database Backup',
      `-- Generated at: ${new Date().toISOString()}`,
      '-- Ordem de importação: Schema → Funções → RLS → Storage → Dados → Triggers → Auth',
      '-- ═══════════════════════════════════════════════════════════',
      '',
    ];

    setProgress({ current: 0, total: totalSteps, label: 'Buscando dados...' });

    const [schemaResult, functionsResult, rlsResult, storageResult, usersResult] = await Promise.all([
      hasSchema ? Promise.all([callBackupApi('schema'), callBackupApi('primary-keys'), callBackupApi('foreign-keys'), callBackupApi('indexes'), callBackupApi('enums')]) : null,
      hasFunctions ? Promise.all([callBackupApi('db-functions'), callBackupApi('triggers')]) : null,
      hasRls ? Promise.all([callBackupApi('rls-policies'), callBackupApi('rls-status')]) : null,
      hasStorage ? Promise.all([callBackupApi('storage-buckets'), callBackupApi('storage-policies')]) : null,
      hasUsers ? callBackupApi('users-list') : null,
    ]);

    // Schema
    if (schemaResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando schema...' });
      const [schema, pks, fks, indexes, enums] = schemaResult;
      const lines: string[] = [];

      if (enums?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════', '-- PASSO 1: ENUMS (Custom Types)', '-- ══════════════════════════════════════════════════════════');
        for (const e of enums) {
          const vals = (e.values as string).split(', ').map((v: string) => `'${v}'`).join(', ');
          lines.push(`DO $$ BEGIN CREATE TYPE public.${e.enum_name} AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
        }
        lines.push('');
      }

      if (schema?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════', '-- PASSO 1: TABLES (CREATE TABLE)', '-- ══════════════════════════════════════════════════════════');
        const pkMap = new Map((pks || []).map((p: any) => [p.table_name, p.pk_columns]));
        for (const t of schema) {
          let def = `CREATE TABLE IF NOT EXISTS public.${t.table_name} (\n${t.columns_def}`;
          const pk = pkMap.get(t.table_name);
          if (pk) def += `,\n  PRIMARY KEY (${pk})`;
          def += '\n);';
          lines.push(def, '');
        }
      }

      if (fks?.length) {
        lines.push('-- FOREIGN KEYS');
        for (const fk of fks) {
          lines.push(`ALTER TABLE public.${fk.table_name} DROP CONSTRAINT IF EXISTS ${fk.constraint_name};`);
          lines.push(`ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});`);
        }
        lines.push('');
      }

      const simpleIndexes: any[] = [];
      const functionDependentIndexes: any[] = [];
      if (indexes?.length) {
        const funcNames = (functionsResult?.[0] || []).map((f: any) => f.function_name as string);
        for (const idx of indexes) {
          const def = idx.indexdef as string;
          funcNames.some((fn: string) => def.includes(fn + '(')) ? functionDependentIndexes.push(idx) : simpleIndexes.push(idx);
        }
      }

      if (simpleIndexes.length) {
        lines.push('-- INDEXES');
        for (const idx of simpleIndexes) {
          lines.push(`${(idx.indexdef as string).replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')};`);
        }
        lines.push('');
      }

      sectionBlocks['_functionIndexes'] = functionDependentIndexes;
      sectionBlocks['schema'] = lines;
    }

    // Functions
    if (functionsResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando funções...' });
      const [funcs, _triggers] = functionsResult;
      const lines: string[] = [];
      if (funcs?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════', '-- PASSO 2: DATABASE FUNCTIONS (devem existir ANTES das RLS)', '-- ══════════════════════════════════════════════════════════');
        for (const f of funcs) { lines.push(f.definition + ';', ''); }
      }
      const funcIndexes = sectionBlocks['_functionIndexes'] as any[] | undefined;
      if (funcIndexes?.length) {
        lines.push('-- INDEXES (dependem de funções acima)');
        for (const idx of funcIndexes) {
          lines.push(`${(idx.indexdef as string).replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')};`);
        }
        lines.push('');
      }
      sectionBlocks['functions'] = lines;
    }

    // RLS
    if (rlsResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando RLS...' });
      const [policies, status] = rlsResult;
      const lines: string[] = ['-- ══════════════════════════════════════════════════════════', '-- PASSO 3: ROW LEVEL SECURITY', '-- ══════════════════════════════════════════════════════════'];
      for (const s of (status || [])) { if (s.rls_enabled) lines.push(`ALTER TABLE public.${s.table_name} ENABLE ROW LEVEL SECURITY;`); }
      lines.push('');
      if (policies?.length) {
        lines.push('-- RLS POLICIES');
        for (const p of policies) {
          lines.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public.${p.tablename};`);
          let stmt = `CREATE POLICY "${p.policyname}" ON public.${p.tablename} AS ${p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE'} FOR ${p.cmd} TO ${p.roles}`;
          if (p.qual) stmt += ` USING (${p.qual})`;
          if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
          lines.push(stmt + ';');
        }
        lines.push('');
      }
      sectionBlocks['rls'] = lines;
    }

    // Storage
    if (storageResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando storage...' });
      const [buckets, policies] = storageResult;
      const lines: string[] = [];
      if (buckets?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════', '-- PASSO 4: STORAGE BUCKETS', '-- ══════════════════════════════════════════════════════════');
        for (const b of buckets) lines.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('${b.id}', '${b.name}', ${b.public}) ON CONFLICT (id) DO NOTHING;`);
        lines.push('');
      }
      if (policies?.length) {
        lines.push('-- STORAGE POLICIES');
        for (const p of policies) {
          lines.push(`DROP POLICY IF EXISTS "${p.policyname}" ON storage.${p.tablename};`);
          let stmt = `CREATE POLICY "${p.policyname}" ON storage.${p.tablename} AS ${p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE'} FOR ${p.cmd} TO ${p.roles}`;
          if (p.qual) stmt += ` USING (${p.qual})`;
          if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
          lines.push(stmt + ';');
        }
        lines.push('');
      }
      sectionBlocks['storage'] = lines;
    }

    // Data
    if (hasData) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Listando tabelas...' });
      const tables = await callBackupApi('list-tables');
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando dados...' });
      const lines: string[] = ['-- ══════════════════════════════════════════════════════════', '-- PASSO 5: TABLE DATA (dados filtrados)', '-- ══════════════════════════════════════════════════════════'];
      const dataTableNames = (tables || []).map((t: any) => t.table_name).filter((name: string) => !EXCLUDED_DATA_TABLES.includes(name));
      for (const tableName of dataTableNames) {
        try {
          const limit = LIMITED_DATA_TABLES[tableName];
          const rows = await callBackupApi('table-data', tableName, limit);
          if (rows?.length) {
            const limitNote = limit ? ` (amostra: ${rows.length} registros)` : '';
            lines.push(`-- Table: ${tableName} (${rows.length} rows)${limitNote}`);
            const cols = Object.keys(rows[0]);
            for (const row of rows) lines.push(`INSERT INTO public.${tableName} (${cols.join(', ')}) VALUES (${cols.map(c => escapeSQL(row[c])).join(', ')}) ON CONFLICT DO NOTHING;`);
            lines.push('');
          }
        } catch (e) { lines.push(`-- Error exporting ${tableName}: ${(e as Error).message}`); }
      }
      if (EXCLUDED_DATA_TABLES.length) {
        lines.push('-- ── TABELAS EXCLUÍDAS (alto volume) ──');
        for (const t of EXCLUDED_DATA_TABLES) lines.push(`-- Excluída: ${t}`);
        lines.push('');
      }
      sectionBlocks['data'] = lines;
    }

    // Triggers
    if (functionsResult) {
      const [_funcs, triggers] = functionsResult;
      if (triggers?.length) {
        const tLines = sectionBlocks['functions'] || [];
        tLines.push('-- ══════════════════════════════════════════════════════════', '-- TRIGGERS', '-- ══════════════════════════════════════════════════════════');
        for (const t of triggers) {
          tLines.push(`DROP TRIGGER IF EXISTS ${t.trigger_name} ON public.${t.event_object_table};`);
          tLines.push(`CREATE TRIGGER ${t.trigger_name} ${t.action_timing} ${t.event_manipulation} ON public.${t.event_object_table} ${t.action_statement};`);
        }
        tLines.push('');
        sectionBlocks['functions'] = tLines;
      }
    }

    // Auth Users
    if (usersResult?.length) {
      const lines = ['-- ══════════════════════════════════════════════════════════', '-- PASSO 6: AUTH USERS (metadados — senhas NÃO exportáveis)', '-- Recrie usuários via: supabase auth admin create-user', '-- ══════════════════════════════════════════════════════════'];
      for (const u of usersResult) lines.push(`-- User: ${u.email} | ID: ${u.id} | Created: ${u.created_at} | Last Sign In: ${u.last_sign_in_at || 'never'}`);
      lines.push('');
      sectionBlocks['users'] = lines;
    }

    // Assemble
    const sizes: Record<string, number> = {};
    const allLines = [...header];
    for (const section of EXPORT_SECTIONS) {
      const block = sectionBlocks[section.id];
      if (block?.length) { sizes[section.id] = new Blob([block.join('\n')]).size; allLines.push(...block); }
    }
    const fullText = allLines.join('\n');
    setSectionSizes(sizes);
    setTotalSize(new Blob([fullText]).size);
    return fullText;
  }, [selectedSections]);

  const generateCSV = useCallback(async () => {
    const sections = EXPORT_SECTIONS.filter(s => selectedSections.has(s.id));
    const csvFiles: { name: string; content: string }[] = [];
    let stepsDone = 0;
    const totalSteps = sections.length;

    for (const section of sections) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: `Exportando ${section.label}...` });

      if (section.id === 'data') {
        const tables = await callBackupApi('list-tables');
        for (const table of (tables || [])) {
          if (EXCLUDED_DATA_TABLES.includes(table.table_name)) continue;
          try {
            const limit = LIMITED_DATA_TABLES[table.table_name];
            const rows = await callBackupApi('table-data', table.table_name, limit);
            if (rows?.length) {
              const cols = Object.keys(rows[0]);
              const csvHeader = cols.join(',');
              const body = rows.map((r: any) => cols.map(c => { const v = r[c]; if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
              csvFiles.push({ name: `data_${table.table_name}.csv`, content: `${csvHeader}\n${body}` });
            }
          } catch { /* skip */ }
        }
      }

      if (section.id === 'rls') {
        const policies = await callBackupApi('rls-policies');
        if (policies?.length) {
          const cols = ['tablename', 'policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check'];
          csvFiles.push({ name: 'rls_policies.csv', content: `${cols.join(',')}\n${policies.map((p: any) => cols.map(c => { const s = String(p[c] ?? ''); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n')}` });
        }
      }

      if (section.id === 'users') {
        const users = await callBackupApi('users-list');
        if (users?.length) {
          const cols = ['id', 'email', 'created_at', 'last_sign_in_at', 'email_confirmed_at', 'phone', 'role'];
          csvFiles.push({ name: 'auth_users.csv', content: `${cols.join(',')}\n${users.map((u: any) => cols.map(c => { const s = String(u[c] ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n')}` });
        }
      }

      if (section.id === 'schema') {
        const columns = await callBackupApi('schema');
        if (columns?.length) csvFiles.push({ name: 'schema_tables.csv', content: `table_name,columns_def\n${columns.map((c: any) => `"${c.table_name}","${(c.columns_def || '').replace(/"/g, '""')}"`).join('\n')}` });
      }

      if (section.id === 'functions') {
        const funcs = await callBackupApi('db-functions');
        if (funcs?.length) csvFiles.push({ name: 'db_functions.csv', content: `function_name,arguments,return_type,definition\n${funcs.map((f: any) => `"${f.function_name}","${(f.arguments || '').replace(/"/g, '""')}","${(f.return_type || '').replace(/"/g, '""')}","${(f.definition || '').replace(/"/g, '""')}"`).join('\n')}` });
      }

      if (section.id === 'storage') {
        const buckets = await callBackupApi('storage-buckets');
        if (buckets?.length) csvFiles.push({ name: 'storage_buckets.csv', content: `id,name,public,created_at\n${buckets.map((b: any) => `${b.id},${b.name},${b.public},${b.created_at}`).join('\n')}` });
      }
    }

    return csvFiles;
  }, [selectedSections]);

  const handleExport = useCallback(async () => {
    if (selectedSections.size === 0) { toast.error('Selecione pelo menos uma seção'); return; }
    setIsExporting(true);
    setSectionSizes({});
    setTotalSize(0);
    setProgress({ current: 0, total: 1, label: 'Iniciando...' });

    try {
      if (format === 'sql') {
        const sql = await generateSQL();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadFile(sql, `wsmartqr_backup_${timestamp}.sql`, 'application/sql');
        toast.success('Backup SQL gerado com sucesso!');
      } else {
        const files = await generateCSV();
        if (files.length === 0) { toast.warning('Nenhum dado encontrado para exportar'); return; }
        if (files.length === 1) { downloadFile(files[0].content, files[0].name, 'text/csv'); }
        else { for (const file of files) { downloadFile(file.content, file.name, 'text/csv'); await new Promise(r => setTimeout(r, 200)); } }
        toast.success(`${files.length} arquivo(s) CSV exportado(s)!`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  }, [format, selectedSections, generateSQL, generateCSV]);

  return {
    selectedSections, toggleSection, selectAll, selectNone,
    format, setFormat,
    isExporting, progress, sectionSizes, totalSize,
    handleExport,
  };
}
