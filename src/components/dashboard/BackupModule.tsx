import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportSection {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  actions: string[];
}

const EXPORT_SECTIONS: ExportSection[] = [
  {
    id: 'schema',
    label: 'Estrutura do Banco (Schema)',
    icon: Database,
    description: 'CREATE TABLE, colunas, tipos, defaults, PKs, FKs, índices e enums',
    actions: ['schema', 'primary-keys', 'foreign-keys', 'indexes', 'enums'],
  },
  {
    id: 'data',
    label: 'Dados das Tabelas',
    icon: Table2,
    description: 'Todos os registros de cada tabela (INSERT statements ou CSV)',
    actions: ['list-tables', 'table-data'],
  },
  {
    id: 'rls',
    label: 'RLS Policies',
    icon: Shield,
    description: 'Todas as políticas de Row Level Security e status RLS por tabela',
    actions: ['rls-policies', 'rls-status'],
  },
  {
    id: 'functions',
    label: 'Funções e Triggers',
    icon: Code,
    description: 'Funções PL/pgSQL do schema public e triggers associados',
    actions: ['db-functions', 'triggers'],
  },
  {
    id: 'users',
    label: 'Usuários (Auth)',
    icon: Users,
    description: 'Lista de usuários autenticados com metadata',
    actions: ['users-list'],
  },
  {
    id: 'storage',
    label: 'Storage (Buckets & Policies)',
    icon: HardDrive,
    description: 'Buckets de storage e suas políticas de acesso',
    actions: ['storage-buckets', 'storage-policies'],
  },
];

const BackupModule = () => {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(EXPORT_SECTIONS.map(s => s.id))
  );
  const [format, setFormat] = useState<'sql' | 'csv'>('sql');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);

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

  const callBackupApi = async (action: string, tableName?: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-backup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, table_name: tableName }),
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

  const generateSQL = useCallback(async () => {
    const lines: string[] = [];
    const sections = EXPORT_SECTIONS.filter(s => selectedSections.has(s.id));
    let stepsDone = 0;
    const totalSteps = sections.reduce((acc, s) => acc + (s.id === 'data' ? 2 : 1), 0);

    lines.push('-- ═══════════════════════════════════════════════════════════');
    lines.push('-- WsmartQR Database Backup');
    lines.push(`-- Generated at: ${new Date().toISOString()}`);
    lines.push('-- ═══════════════════════════════════════════════════════════');
    lines.push('');

    for (const section of sections) {
      if (section.id === 'schema') {
        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando schema...' });
        const [schema, pks, fks, indexes, enums] = await Promise.all([
          callBackupApi('schema'),
          callBackupApi('primary-keys'),
          callBackupApi('foreign-keys'),
          callBackupApi('indexes'),
          callBackupApi('enums'),
        ]);

        // Enums first
        if (enums?.length) {
          lines.push('-- ── ENUMS ──────────────────────────────────────────────────');
          for (const e of enums) {
            const vals = (e.values as string).split(', ').map((v: string) => `'${v}'`).join(', ');
            lines.push(`CREATE TYPE public.${e.enum_name} AS ENUM (${vals});`);
          }
          lines.push('');
        }

        // Tables
        if (schema?.length) {
          lines.push('-- ── TABLES ─────────────────────────────────────────────────');
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

        // Foreign keys
        if (fks?.length) {
          lines.push('-- ── FOREIGN KEYS ──────────────────────────────────────────');
          for (const fk of fks) {
            lines.push(`ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name});`);
          }
          lines.push('');
        }

        // Indexes
        if (indexes?.length) {
          lines.push('-- ── INDEXES ────────────────────────────────────────────────');
          for (const idx of indexes) {
            lines.push(`${idx.indexdef};`);
          }
          lines.push('');
        }
      }

      if (section.id === 'rls') {
        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando RLS...' });
        const [policies, status] = await Promise.all([
          callBackupApi('rls-policies'),
          callBackupApi('rls-status'),
        ]);

        lines.push('-- ── RLS ENABLE ─────────────────────────────────────────────');
        for (const s of (status || [])) {
          if (s.rls_enabled) {
            lines.push(`ALTER TABLE public.${s.table_name} ENABLE ROW LEVEL SECURITY;`);
          }
        }
        lines.push('');

        if (policies?.length) {
          lines.push('-- ── RLS POLICIES ──────────────────────────────────────────');
          for (const p of policies) {
            const perm = p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
            let stmt = `CREATE POLICY "${p.policyname}" ON public.${p.tablename} AS ${perm} FOR ${p.cmd} TO ${p.roles}`;
            if (p.qual) stmt += ` USING (${p.qual})`;
            if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
            stmt += ';';
            lines.push(stmt);
          }
          lines.push('');
        }
      }

      if (section.id === 'functions') {
        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando funções...' });
        const [funcs, triggers] = await Promise.all([
          callBackupApi('db-functions'),
          callBackupApi('triggers'),
        ]);

        if (funcs?.length) {
          lines.push('-- ── DATABASE FUNCTIONS ─────────────────────────────────────');
          for (const f of funcs) {
            lines.push(f.definition + ';');
            lines.push('');
          }
        }

        if (triggers?.length) {
          lines.push('-- ── TRIGGERS ──────────────────────────────────────────────');
          for (const t of triggers) {
            lines.push(`CREATE TRIGGER ${t.trigger_name} ${t.action_timing} ${t.event_manipulation} ON public.${t.event_object_table} ${t.action_statement};`);
          }
          lines.push('');
        }
      }

      if (section.id === 'data') {
        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Listando tabelas...' });
        const tables = await callBackupApi('list-tables');

        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando dados...' });
        lines.push('-- ── TABLE DATA ────────────────────────────────────────────');
        for (const table of (tables || [])) {
          try {
            const rows = await callBackupApi('table-data', table.table_name);
            if (rows?.length) {
              lines.push(`-- Table: ${table.table_name} (${rows.length} rows)`);
              const cols = Object.keys(rows[0]);
              for (const row of rows) {
                const vals = cols.map(c => escapeSQL(row[c])).join(', ');
                lines.push(`INSERT INTO public.${table.table_name} (${cols.join(', ')}) VALUES (${vals});`);
              }
              lines.push('');
            }
          } catch (e) {
            lines.push(`-- Error exporting ${table.table_name}: ${(e as Error).message}`);
          }
        }
      }

      if (section.id === 'users') {
        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando usuários...' });
        const users = await callBackupApi('users-list');
        if (users?.length) {
          lines.push('-- ── AUTH USERS ─────────────────────────────────────────────');
          lines.push('-- Note: These are read-only exports. User passwords cannot be exported.');
          for (const u of users) {
            lines.push(`-- User: ${u.email} | ID: ${u.id} | Created: ${u.created_at} | Last Sign In: ${u.last_sign_in_at || 'never'}`);
          }
          lines.push('');
        }
      }

      if (section.id === 'storage') {
        setProgress({ current: ++stepsDone, total: totalSteps, label: 'Exportando storage...' });
        const [buckets, policies] = await Promise.all([
          callBackupApi('storage-buckets'),
          callBackupApi('storage-policies'),
        ]);

        if (buckets?.length) {
          lines.push('-- ── STORAGE BUCKETS ────────────────────────────────────────');
          for (const b of buckets) {
            lines.push(`INSERT INTO storage.buckets (id, name, public) VALUES ('${b.id}', '${b.name}', ${b.public}) ON CONFLICT (id) DO NOTHING;`);
          }
          lines.push('');
        }

        if (policies?.length) {
          lines.push('-- ── STORAGE POLICIES ──────────────────────────────────────');
          for (const p of policies) {
            const perm = p.permissive === 'PERMISSIVE' ? 'PERMISSIVE' : 'RESTRICTIVE';
            let stmt = `CREATE POLICY "${p.policyname}" ON storage.${p.tablename} AS ${perm} FOR ${p.cmd} TO ${p.roles}`;
            if (p.qual) stmt += ` USING (${p.qual})`;
            if (p.with_check) stmt += ` WITH CHECK (${p.with_check})`;
            stmt += ';';
            lines.push(stmt);
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n');
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
          try {
            const rows = await callBackupApi('table-data', table.table_name);
            if (rows?.length) {
              const cols = Object.keys(rows[0]);
              const header = cols.join(',');
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
              csvFiles.push({ name: `data_${table.table_name}.csv`, content: `${header}\n${body}` });
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
          const header = cols.join(',');
          const body = policies.map((p: any) =>
            cols.map(c => {
              const v = p[c] ?? '';
              const s = String(v);
              return s.includes(',') || s.includes('"') || s.includes('\n')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            }).join(',')
          ).join('\n');
          csvFiles.push({ name: 'rls_policies.csv', content: `${header}\n${body}` });
        }
      }

      if (section.id === 'users') {
        const users = await callBackupApi('users-list');
        if (users?.length) {
          const cols = ['id', 'email', 'created_at', 'last_sign_in_at', 'email_confirmed_at', 'phone', 'role'];
          const header = cols.join(',');
          const body = users.map((u: any) =>
            cols.map(c => {
              const v = u[c] ?? '';
              const s = String(v);
              return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
            }).join(',')
          ).join('\n');
          csvFiles.push({ name: 'auth_users.csv', content: `${header}\n${body}` });
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
          // Download each file
          for (const file of files) {
            downloadFile(file.content, file.name, 'text/csv');
            await new Promise(r => setTimeout(r, 200)); // small delay between downloads
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
          <h3 className="text-lg font-semibold">Módulo de Backup</h3>
          <p className="text-sm text-muted-foreground">
            Exporte a estrutura, dados e configurações do banco de dados
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

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={selectAll}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Selecionar tudo
        </Button>
        <Button variant="outline" size="sm" onClick={selectNone}>
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Limpar seleção
        </Button>
      </div>

      {/* Sections */}
      <div className="grid gap-3">
        {EXPORT_SECTIONS.map((section) => {
          const isSelected = selectedSections.has(section.id);
          const Icon = section.icon;
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
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-primary/10 text-primary' : 'bg-muted/50 text-muted-foreground'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{section.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>
              {format === 'sql' && section.id === 'data' && (
                <Badge variant="outline" className="text-xs shrink-0">INSERT INTO</Badge>
              )}
              {format === 'csv' && section.id === 'data' && (
                <Badge variant="outline" className="text-xs shrink-0">1 CSV/tabela</Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-muted-foreground" />
          Informações sobre o Backup
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
          <li><strong>SQL</strong>: Gera um único arquivo .sql executável no SQL Editor para recriar toda a estrutura e dados</li>
          <li><strong>CSV</strong>: Gera múltiplos arquivos .csv (um por tabela/seção) para análise em planilhas</li>
          <li><strong>Senhas</strong>: Senhas de usuários NÃO são exportáveis por segurança</li>
          <li><strong>Secrets</strong>: Valores de secrets são criptografados e não podem ser exportados</li>
          <li><strong>Edge Functions</strong>: O código das funções de borda está no repositório do projeto</li>
          <li><strong>Limite</strong>: Máximo de 10.000 registros por tabela</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupModule;