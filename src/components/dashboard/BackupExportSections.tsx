import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { EXPORT_SECTIONS, formatKB, type ExportSection } from '@/hooks/useBackupExport';

interface BackupExportSectionsProps {
  selectedSections: Set<string>;
  onToggle: (id: string) => void;
  sectionSizes: Record<string, number>;
  format: 'sql' | 'csv';
}

const BackupExportSections = ({ selectedSections, onToggle, sectionSizes, format }: BackupExportSectionsProps) => {
  return (
    <div className="grid gap-3">
      {EXPORT_SECTIONS.map((section) => {
        const isSelected = selectedSections.has(section.id);
        const Icon = section.icon;
        const size = sectionSizes[section.id];
        return (
          <div
            key={section.id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
              isSelected ? 'border-primary/30 bg-primary/5' : 'border-border/50 hover:border-border'
            }`}
            onClick={() => onToggle(section.id)}
          >
            <Checkbox checked={isSelected} onCheckedChange={() => onToggle(section.id)} className="shrink-0" />
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
                <Badge variant="secondary" className="text-xs font-mono">{formatKB(size)}</Badge>
              )}
              {format === 'sql' && section.id === 'data' && (
                <Badge variant="outline" className="text-xs">INSERT INTO</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BackupExportSections;
