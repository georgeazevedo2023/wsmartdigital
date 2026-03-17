import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Database, Download, FileText, Code, Loader2, CheckCircle2, AlertCircle, ListChecks,
} from 'lucide-react';
import { useBackupExport, formatKB } from '@/hooks/useBackupExport';
import BackupExportSections from './BackupExportSections';
import BackupMigrationGuide from './BackupMigrationGuide';

const BackupModule = () => {
  const backup = useBackupExport();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Módulo de Backup & Migração
          </h3>
          <p className="text-sm text-muted-foreground">Exporte na ordem correta de migração para o Supabase</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={backup.format} onValueChange={(v) => backup.setFormat(v as 'sql' | 'csv')}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sql"><span className="flex items-center gap-2"><Code className="w-3.5 h-3.5" /> SQL</span></SelectItem>
              <SelectItem value="csv"><span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> CSV</span></SelectItem>
            </SelectContent>
          </Select>
          <LoadingButton onClick={backup.handleExport} disabled={backup.selectedSections.size === 0} loading={backup.isExporting} loadingText="Exportando...">
            <Download className="w-4 h-4" /> Exportar
          </LoadingButton>
        </div>
      </div>

      {/* Progress */}
      {backup.progress && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{backup.progress.label}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.round((backup.progress.current / backup.progress.total) * 100)}%` }} />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{backup.progress.current}/{backup.progress.total}</span>
          </div>
        </div>
      )}

      {/* Total size */}
      {backup.totalSize > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-400">Arquivo gerado: {formatKB(backup.totalSize)} total</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={backup.selectAll}>
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Selecionar tudo
        </Button>
        <Button variant="outline" size="sm" onClick={backup.selectNone}>
          <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Limpar seleção
        </Button>
      </div>

      {/* Export sections */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          Módulos de Exportação (ordem de migração)
        </h4>
        <BackupExportSections
          selectedSections={backup.selectedSections}
          onToggle={backup.toggleSection}
          sectionSizes={backup.sectionSizes}
          format={backup.format}
        />
      </div>

      {/* Migration Guide */}
      <BackupMigrationGuide />
    </div>
  );
};

export default BackupModule;
