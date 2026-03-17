import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import { Link, Copy, Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  label: string;
  value: string | null;
  isEditing: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

const WebhookRow = ({ label, value, isEditing, editValue, setEditValue, onEdit, onSave, onCancel, isSaving }: Props) => {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Input className="h-8 text-xs flex-1" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus placeholder="https://..." />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" disabled={isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/20 min-h-[32px]">
      <Link className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground font-medium shrink-0">{label}:</span>
      {value ? (
        <>
          <ActionTooltip label={value} side="top">
            <span className="text-xs text-muted-foreground truncate flex-1 cursor-default">{value}</span>
          </ActionTooltip>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText(value); toast.success('Copiado!'); }}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
          </Button>
        </>
      ) : (
        <button onClick={onEdit} className="text-xs text-primary/70 hover:text-primary transition-colors ml-auto">
          + Adicionar
        </button>
      )}
    </div>
  );
};

export default WebhookRow;
