import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Database,
  Download,
  FileText,
  Shield,
  Users,
  HardDrive,
  Code,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Table2,
  Key,
  Zap,
  ListChecks,
  ArrowRight,
  Info,
  BookOpen,
  Terminal,
  Globe,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportSection {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  actions: string[];
  step: number;
  migrationNote: string;
}

const EXPORT_SECTIONS: ExportSection[] = [
  {
    id: 'schema',
    label: 'Estrutura do Banco (Schema)',
    icon: Database,
    description: 'ENUMs, CREATE TABLE, PKs, FKs e índices',
    actions: ['schema', 'primary-keys', 'foreign-keys', 'indexes', 'enums'],
    step: 1,
    migrationNote: 'Execute primeiro no SQL Editor do novo projeto',
  },
  {
    id: 'functions',
    label: 'Funções e Triggers',
    icon: Code,
    description: 'Funções PL/pgSQL (is_super_admin, has_role, etc.) e triggers',
    actions: ['db-functions', 'triggers'],
    step: 2,
    migrationNote: 'Devem existir ANTES das RLS policies',
  },
  {
    id: 'rls',
    label: 'RLS Policies',
    icon: Shield,
    description: 'Enable RLS + todas as policies de segurança',
    actions: ['rls-policies', 'rls-status'],
    step: 3,
    migrationNote: 'Depende das funções do passo 2',
  },
  {
    id: 'storage',
    label: 'Storage (Buckets & Policies)',
    icon: HardDrive,
    description: 'Buckets de storage e suas políticas de acesso',
    actions: ['storage-buckets', 'storage-policies'],
    step: 4,
    migrationNote: 'Arquivos dentro dos buckets NÃO são migrados',
  },
  {
    id: 'data',
    label: 'Dados das Tabelas (filtrado)',
    icon: Table2,
    description: 'Dados estruturais + amostras limitadas de conversas e leads',
    actions: ['list-tables', 'table-data'],
    step: 5,
    migrationNote: 'INSERTs filtrados — apenas dados essenciais',
  },
  {
    id: 'users',
    label: 'Usuários (Auth)',
    icon: Users,
    description: 'Metadados dos usuários autenticados (sem senhas)',
    actions: ['users-list'],
    step: 6,
    migrationNote: 'Senhas NÃO podem ser exportadas',
  },
];

// Tables completely excluded from data export
const EXCLUDED_DATA_TABLES = [
  'contacts', 'broadcast_logs', 'instance_connection_logs',
  'scheduled_message_logs', 'shift_report_logs',
  'conversation_labels', 'kanban_cards', 'kanban_card_data',
];

// Tables with limited rows in export
const LIMITED_DATA_TABLES: Record<string, number> = {
  'conversation_messages': 5,
  'conversations': 5,
  'lead_database_entries': 30,
};

const BackupModule = () => {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(EXPORT_SECTIONS.map(s => s.id))
  );
  const [format, setFormat] = useState<'sql' | 'csv'>('sql');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [sectionSizes, setSectionSizes] = useState<Record<string, number>>({});
  const [totalSize, setTotalSize] = useState<number>(0);

  const toggleSection = (id: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedSections(new Set(EXPORT_SECTIONS.map(s => s.id)));
  const selectNone = () => setSelectedSections(new Set());

  const callBackupApi = async (action: string, tableName?: string, limit?: number) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-backup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, table_name: tableName, limit }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro na API');
    }
    const json = await res.json();
    return json.data || [];
  };

  const escapeSQL = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  const formatKB = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
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

    const header: string[] = [];
    header.push('-- ═══════════════════════════════════════════════════════════');
    header.push('-- WsmartQR Database Backup');
    header.push(`-- Generated at: ${new Date().toISOString()}`);
    header.push('-- Ordem de importação: Schema → Funções → RLS → Storage → Dados → Triggers → Auth');
    header.push('-- ═══════════════════════════════════════════════════════════');
    header.push('');

    // ── Fetch all needed data in parallel ──
    const schemaPromise = hasSchema ? Promise.all([
      callBackupApi('schema'),
      callBackupApi('primary-keys'),
      callBackupApi('foreign-keys'),
      callBackupApi('indexes'),
      callBackupApi('enums'),
    ]) : Promise.resolve(null);

    const functionsPromise = hasFunctions ? Promise.all([
      callBackupApi('db-functions'),
      callBackupApi('triggers'),
    ]) : Promise.resolve(null);

    const rlsPromise = hasRls ? Promise.all([
      callBackupApi('rls-policies'),
      callBackupApi('rls-status'),
    ]) : Promise.resolve(null);

    const storagePromise = hasStorage ? Promise.all([
      callBackupApi('storage-buckets'),
      callBackupApi('storage-policies'),
    ]) : Promise.resolve(null);

    const usersPromise = hasUsers ? callBackupApi('users-list') : Promise.resolve(null);

    setProgress({ current: 0, total: totalSteps, label: 'Buscando dados...' });

    const [schemaResult, functionsResult, rlsResult, storageResult, usersResult] = await Promise.all([
      schemaPromise, functionsPromise, rlsPromise, storagePromise, usersPromise,
    ]);

    // ── 1. Schema: ENUMs + Tables + FKs + Indexes ──
    if (schemaResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando schema...' });
      const [schema, pks, fks, indexes, enums] = schemaResult;
      const lines: string[] = [];

      if (enums?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════');
        lines.push('-- PASSO 1: ENUMS (Custom Types)');
        lines.push('-- ══════════════════════════════════════════════════════════');
        for (const e of enums) {
          const vals = (e.values as string).split(', ').map((v: string) => `'${v}'`).join(', ');
          lines.push(`DO $$ BEGIN CREATE TYPE public.${e.enum_name} AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
        }
        lines.push('');
      }

      if (schema?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════');
        lines.push('-- PASSO 1: TABLES (CREATE TABLE)');
        lines.push('-- ══════════════════════════════════════════════════════════');
        const pkMap = new Map((pks || []).map((p: any) => [p.table_name, p.pk_columns]));
        for (const t of schema) {
          let def = `CREATE TABLE IF NOT EXISTS public.${t.table_name} (\n${t.columns_def}`;
          const pk = pkMap.get(t.table_name);
          if (pk) def += `,\n  PRIMARY KEY (${pk})`;
          def += '\n);';
          lines.push(def);
          lines.push('');
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

      if (indexes?.length) {
        lines.push('-- INDEXES');
        for (const idx of indexes) {
          const idxDef = (idx.indexdef as string)
            .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
            .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ');
          lines.push(`${idxDef};`);
        }
        lines.push('');
      }

      sectionBlocks['schema'] = lines;
    }

    // ── 2. Functions ──
    if (functionsResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando funções...' });
      const [funcs, _triggers] = functionsResult;
      const lines: string[] = [];

      if (funcs?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════');
        lines.push('-- PASSO 2: DATABASE FUNCTIONS (devem existir ANTES das RLS)');
        lines.push('-- ══════════════════════════════════════════════════════════');
        for (const f of funcs) {
          lines.push(f.definition + ';');
          lines.push('');
        }
      }

      sectionBlocks['functions'] = lines;
    }

    // ── 3. RLS Enable + Policies ──
    if (rlsResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando RLS...' });
      const [policies, status] = rlsResult;
      const lines: string[] = [];

      lines.push('-- ══════════════════════════════════════════════════════════');
      lines.push('-- PASSO 3: ROW LEVEL SECURITY');
      lines.push('-- ══════════════════════════════════════════════════════════');

      for (const s of (status || [])) {
        if (s.rls_enabled) {
          lines.push(`ALTER TABLE public.${s.table_name} ENABLE ROW LEVEL SECURITY;`);
        }
      }
      lines.push('');

      if (policies?.length) {
        lines.push('-- RLS POLICIES');
        for (const p of policies) {
          lines.push(`DROP POLICY IF EXISTS "${p.policyname}" ON public.${p.tablename};`);
          const perm = p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
          let stmt = `CREATE POLICY "${p.policyname}" ON public.${p.tablename} AS ${perm} FOR ${p.cmd} TO ${p.roles}`;
          if (p.qual) stmt += ` USING (${p.qual})`;
          if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
          stmt += ';';
          lines.push(stmt);
        }
        lines.push('');
      }

      sectionBlocks['rls'] = lines;
    }

    // ── 4. Storage ──
    if (storageResult) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Gerando storage...' });
      const [buckets, policies] = storageResult;
      const lines: string[] = [];

      if (buckets?.length) {
        lines.push('-- ══════════════════════════════════════════════════════════');
        lines.push('-- PASSO 4: STORAGE BUCKETS');
        lines.push('-- ══════════════════════════════════════════════════════════');
        for (const b of buckets) {
          lines.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('${b.id}', '${b.name}', ${b.public}) ON CONFLICT (id) DO NOTHING;`);
        }
        lines.push('');
      }

      if (policies?.length) {
        lines.push('-- STORAGE POLICIES');
        for (const p of policies) {
          lines.push(`DROP POLICY IF EXISTS "${p.policyname}" ON storage.${p.tablename};`);
          const perm = p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
          let stmt = `CREATE POLICY "${p.policyname}" ON storage.${p.tablename} AS ${perm} FOR ${p.cmd} TO ${p.roles}`;
          if (p.qual) stmt += ` USING (${p.qual})`;
          if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
          stmt += ';';
          lines.push(stmt);
        }
        lines.push('');
      }

      sectionBlocks['storage'] = lines;
    }

    // ── 5. Data (filtered) ──
    if (hasData) {
      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Listando tabelas...' });
      const tables = await callBackupApi('list-tables');

      setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando dados...' });
      const lines: string[] = [];
      lines.push('-- ══════════════════════════════════════════════════════════');
      lines.push('-- PASSO 5: TABLE DATA (dados filtrados)');
      lines.push('-- ══════════════════════════════════════════════════════════');

      const dataTableNames = (tables || [])
        .map((t: any) => t.table_name)
        .filter((name: string) => !EXCLUDED_DATA_TABLES.includes(name));

      for (const tableName of dataTableNames) {
        try {
          const limit = LIMITED_DATA_TABLES[tableName];
          const rows = await callBackupApi('table-data', tableName, limit);
          if (rows?.length) {
            const limitNote = limit ? ` (amostra: ${rows.length} registros)` : '';
            lines.push(`-- Table: ${tableName} (${rows.length} rows)${limitNote}`);
            const cols = Object.keys(rows[0]);
            for (const row of rows) {
              const vals = cols.map(c => escapeSQL(row[c])).join(', ');
              lines.push(`INSERT INTO public.${tableName} (${cols.join(', ')}) VALUES (${vals}) ON CONFLICT DO NOTHING;`);
            }
            lines.push('');
          }
        } catch (e) {
          lines.push(`-- Error exporting ${tableName}: ${(e as Error).message}`);
        }
      }

      if (EXCLUDED_DATA_TABLES.length) {
        lines.push('-- ── TABELAS EXCLUÍDAS (alto volume) ──');
        for (const t of EXCLUDED_DATA_TABLES) {
          lines.push(`-- Excluída: ${t}`);
        }
        lines.push('');
      }

      sectionBlocks['data'] = lines;
    }

    // ── Triggers (after functions and tables) ──
    if (functionsResult) {
      const [_funcs, triggers] = functionsResult;
      if (triggers?.length) {
        const tLines = sectionBlocks['functions'] || [];
        tLines.push('-- ══════════════════════════════════════════════════════════');
        tLines.push('-- TRIGGERS');
        tLines.push('-- ══════════════════════════════════════════════════════════');
        for (const t of triggers) {
          tLines.push(`DROP TRIGGER IF EXISTS ${t.trigger_name} ON public.${t.event_object_table};`);
          tLines.push(`CREATE TRIGGER ${t.trigger_name} ${t.action_timing} ${t.event_manipulation} ON public.${t.event_object_table} ${t.action_statement};`);
        }
        tLines.push('');
        sectionBlocks['functions'] = tLines;
      }
    }

    // ── 6. Auth Users ──
    if (usersResult?.length) {
      const lines: string[] = [];
      lines.push('-- ══════════════════════════════════════════════════════════');
      lines.push('-- PASSO 6: AUTH USERS (metadados — senhas NÃO exportáveis)');
      lines.push('-- Recrie usuários via: supabase auth admin create-user');
      lines.push('-- ══════════════════════════════════════════════════════════');
      for (const u of usersResult) {
        lines.push(`-- User: ${u.email} | ID: ${u.id} | Created: ${u.created_at} | Last Sign In: ${u.last_sign_in_at || 'never'}`);
      }
      lines.push('');
      sectionBlocks['users'] = lines;
    }

    // ── Calculate sizes and assemble ──
    const sizes: Record<string, number> = {};
    const allLines = [...header];
    for (const section of EXPORT_SECTIONS) {
      const block = sectionBlocks[section.id];
      if (block?.length) {
        const blockText = block.join('\n');
        sizes[section.id] = new Blob([blockText]).size;
        allLines.push(...block);
      }
    }

    const fullText = allLines.join('\n');
    const totalBytes = new Blob([fullText]).size;
    setSectionSizes(sizes);
    setTotalSize(totalBytes);

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
              const body = rows.map((r: any) =>
                cols.map(c => {
                  const v = r[c];
                  if (v === null || v === undefined) return '';
                  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
                  return s.includes(',') || s.includes('"') || s.includes('\n')
                    ? `"${s.replace(/"/g, '""')}"`
                    : s;
                }).join(',')
              ).join('\n');
              csvFiles.push({ name: `data_${table.table_name}.csv`, content: `${csvHeader}\n${body}` });
            }
          } catch {
            // skip
          }
        }
      }

      if (section.id === 'rls') {
        const policies = await callBackupApi('rls-policies');
        if (policies?.length) {
          const cols = ['tablename', 'policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check'];
          const csvHeader = cols.join(',');
          const body = policies.map((p: any) =>
            cols.map(c => {
              const v = p[c] ?? '';
              const s = String(v);
              return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            }).join(',')
          ).join('\n');
          csvFiles.push({ name: 'rls_policies.csv', content: `${csvHeader}\n${body}` });
        }
      }

      if (section.id === 'users') {
        const users = await callBackupApi('users-list');
        if (users?.length) {
          const cols = ['id', 'email', 'created_at', 'last_sign_in_at', 'email_confirmed_at', 'phone', 'role'];
          const csvHeader = cols.join(',');
          const body = users.map((u: any) =>
            cols.map(c => {
              const v = u[c] ?? '';
              const s = String(v);
              return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            }).join(',')
          ).join('\n');
          csvFiles.push({ name: 'auth_users.csv', content: `${csvHeader}\n${body}` });
        }
      }

      if (section.id === 'schema') {
        const columns = await callBackupApi('schema');
        if (columns?.length) {
          csvFiles.push({ name: 'schema_tables.csv', content: `table_name,columns_def\n${columns.map((c: any) => `"${c.table_name}","${(c.columns_def || '').replace(/"/g, '""')}"`).join('\n')}` });
        }
      }

      if (section.id === 'functions') {
        const funcs = await callBackupApi('db-functions');
        if (funcs?.length) {
          csvFiles.push({ name: 'db_functions.csv', content: `function_name,arguments,return_type,definition\n${funcs.map((f: any) => `"${f.function_name}","${(f.arguments || '').replace(/"/g, '""')}","${(f.return_type || '').replace(/"/g, '""')}","${(f.definition || '').replace(/"/g, '""')}"`).join('\n')}` });
        }
      }

      if (section.id === 'storage') {
        const buckets = await callBackupApi('storage-buckets');
        if (buckets?.length) {
          csvFiles.push({ name: 'storage_buckets.csv', content: `id,name,public,created_at\n${buckets.map((b: any) => `${b.id},${b.name},${b.public},${b.created_at}`).join('\n')}` });
        }
      }
    }

    return csvFiles;
  }, [selectedSections]);

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

  const handleExport = async () => {
    if (selectedSections.size === 0) {
      toast.error('Selecione pelo menos uma seção');
      return;
    }

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
        if (files.length === 0) {
          toast.warning('Nenhum dado encontrado para exportar');
          return;
        }
        if (files.length === 1) {
          downloadFile(files[0].content, files[0].name, 'text/csv');
        } else {
          for (const file of files) {
            downloadFile(file.content, file.name, 'text/csv');
            await new Promise(r => setTimeout(r, 200));
          }
        }
        toast.success(`${files.length} arquivo(s) CSV exportado(s)!`);
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Módulo de Backup & Migração
          </h3>
          <p className="text-sm text-muted-foreground">
            Exporte na ordem correta de migração para o Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={format} onValueChange={(v) => setFormat(v as 'sql' | 'csv')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sql">
                <span className="flex items-center gap-2">
                  <Code className="w-3.5 h-3.5" /> SQL
                </span>
              </SelectItem>
              <SelectItem value="csv">
                <span className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> CSV
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} disabled={isExporting || selectedSections.size === 0}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{progress.label}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {progress.current}/{progress.total}
            </span>
          </div>
        </div>
      )}

      {/* Total size after export */}
      {totalSize > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Arquivo gerado: {formatKB(totalSize)} total
          </p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={selectAll}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Selecionar tudo
        </Button>
        <Button variant="outline" size="sm" onClick={selectNone}>
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Limpar seleção
        </Button>
      </div>

      {/* Sections in migration order */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          Módulos de Exportação (ordem de migração)
        </h4>
        <div className="grid gap-3">
          {EXPORT_SECTIONS.map((section) => {
            const isSelected = selectedSections.has(section.id);
            const Icon = section.icon;
            const size = sectionSizes[section.id];
            return (
              <div
                key={section.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/50 hover:border-border'
                }`}
                onClick={() => toggleSection(section.id)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSection(section.id)}
                  className="shrink-0"
                />
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {section.step}
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{section.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                  <p className="text-[10px] text-primary/70 mt-0.5 italic">{section.migrationNote}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {size !== undefined && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {formatKB(size)}
                    </Badge>
                  )}
                  {format === 'sql' && section.id === 'data' && (
                    <Badge variant="outline" className="text-xs">INSERT INTO</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ GUIA DE MIGRAÇÃO DIDÁTICO ═══ */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Guia de Migração para Supabase
        </h4>
        <p className="text-sm text-muted-foreground">
          Siga os passos abaixo na ordem indicada para migrar seu projeto completo.
        </p>

        <div className="grid gap-3">
          {/* Step 1 */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Criar Novo Projeto Supabase
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Acesse <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase.com/dashboard</code> e crie um novo projeto</li>
                    <li>Anote: <strong>URL</strong>, <strong>anon key</strong> e <strong>service role key</strong></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" /> Executar Schema (Passo 1 acima)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Exporte com <strong>"Estrutura do Banco"</strong> selecionado</li>
                    <li>No SQL Editor do novo projeto, cole e execute o SQL gerado</li>
                    <li>Isso cria: ENUMs → Tabelas → FKs → Índices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Code className="w-4 h-4" /> Funções e Triggers (Passo 2 acima)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Exporte com <strong>"Funções e Triggers"</strong> selecionado</li>
                    <li>Execute no SQL Editor — <strong>ANTES</strong> das RLS policies</li>
                    <li>Inclui: <code className="px-1 py-0.5 rounded bg-muted text-foreground">is_super_admin</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">has_inbox_access</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">handle_new_user</code>, etc.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 4 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">4</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" /> RLS Policies (Passo 3 acima)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Exporte com <strong>"RLS Policies"</strong> selecionado</li>
                    <li>Execute no SQL Editor</li>
                    <li>Verifique que todas as tabelas têm RLS habilitado</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 5 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">5</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <HardDrive className="w-4 h-4" /> Storage (Passo 4 acima)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Exporte com <strong>"Storage"</strong> selecionado</li>
                    <li>Execute os INSERTs para criar buckets e policies</li>
                    <li>⚠️ Arquivos dentro dos buckets NÃO são migrados automaticamente</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 6 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">6</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Table2 className="w-4 h-4" /> Dados Filtrados (Passo 5 acima)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Exporte com <strong>"Dados das Tabelas"</strong> selecionado</li>
                    <li>Inclui: perfis, roles, instâncias, inboxes, kanban, templates, etc.</li>
                    <li>Amostras: 5 conversas + 5 mensagens, 30 leads (para validação)</li>
                    <li>Execute os INSERTs no SQL Editor</li>
                  </ul>
                  <div className="mt-2 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
                    <strong>Excluídas:</strong> contacts, broadcast_logs, instance_connection_logs, scheduled_message_logs, shift_report_logs, conversation_labels, kanban_cards, kanban_card_data
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 7 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">7</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Edge Functions
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Copie a pasta <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase/functions/</code> para o novo projeto</li>
                    <li>Copie <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase/config.toml</code> (atualize o project_id)</li>
                    <li>Deploy: <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase functions deploy --project-ref NOVO_ID</code></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 8 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">8</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Key className="w-4 h-4" /> Configurar Secrets
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Via CLI: <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase secrets set NOME=valor --project-ref NOVO_ID</code></li>
                    <li><code className="px-1 py-0.5 rounded bg-muted text-foreground">UAZAPI_SERVER_URL</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">UAZAPI_ADMIN_TOKEN</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">GROQ_API_KEY</code></li>
                    <li>SUPABASE_URL, ANON_KEY e SERVICE_ROLE_KEY são configurados automaticamente</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 9 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">9</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" /> Usuários (Auth)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Senhas NÃO podem ser migradas — usuários precisarão redefinir</li>
                    <li>Recrie via: <code className="px-1 py-0.5 rounded bg-muted text-foreground">supabase auth admin create-user</code></li>
                    <li>Os dados de <code className="px-1 py-0.5 rounded bg-muted text-foreground">user_profiles</code> e <code className="px-1 py-0.5 rounded bg-muted text-foreground">user_roles</code> já estão nos dados exportados</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 10 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">10</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Atualizar Frontend (.env)
                  </h5>
                  <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Atualize o <code className="px-1 py-0.5 rounded bg-muted text-foreground">.env</code> com as novas credenciais:</li>
                    <li><code className="px-1 py-0.5 rounded bg-muted text-foreground">VITE_SUPABASE_URL</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</code>, <code className="px-1 py-0.5 rounded bg-muted text-foreground">VITE_SUPABASE_PROJECT_ID</code></li>
                    <li>Atualize URLs de webhooks externos (n8n, etc.) para o novo projeto</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edge Functions list */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Edge Functions do Projeto
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {[
            { name: 'uazapi-proxy', desc: 'Proxy para API UAZAPI (WhatsApp)' },
            { name: 'whatsapp-webhook', desc: 'Recebe webhooks do WhatsApp' },
            { name: 'admin-create-user', desc: 'Criação de usuários (admin)' },
            { name: 'admin-delete-user', desc: 'Exclusão de usuários (admin)' },
            { name: 'sync-conversations', desc: 'Sincroniza conversas do helpdesk' },
            { name: 'transcribe-audio', desc: 'Transcrição de áudio (Groq)' },
            { name: 'summarize-conversation', desc: 'Resumo de conversa com IA' },
            { name: 'auto-summarize', desc: 'Auto-resumo ao resolver conversa' },
            { name: 'analyze-summaries', desc: 'Análise inteligente de resumos' },
            { name: 'send-shift-report', desc: 'Relatório de turno automático' },
            { name: 'process-scheduled-messages', desc: 'Processa mensagens agendadas' },
            { name: 'fire-outgoing-webhook', desc: 'Dispara webhooks de saída' },
            { name: 'activate-ia', desc: 'Ativa/desativa IA na conversa' },
            { name: 'cleanup-old-media', desc: 'Limpeza de mídias antigas' },
            { name: 'database-backup', desc: 'Este módulo de backup' },
          ].map(fn => (
            <div key={fn.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border/30">
              <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{fn.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{fn.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Observações */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          Observações Importantes
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
          <li>O SQL gerado usa <code className="px-1 py-0.5 rounded bg-muted text-foreground">ON CONFLICT DO NOTHING</code> nos INSERTs para permitir reimportação</li>
          <li><strong>Senhas</strong> de usuários NÃO são exportáveis por segurança</li>
          <li><strong>Secrets</strong> são criptografados — reconfigure manualmente</li>
          <li><strong>Realtime</strong>: reconfigure publicações: <code className="px-1 py-0.5 rounded bg-muted text-foreground">ALTER PUBLICATION supabase_realtime ADD TABLE nome_tabela;</code></li>
          <li><strong>CRON Jobs</strong>: reconfigure pg_cron se existirem</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupModule;
