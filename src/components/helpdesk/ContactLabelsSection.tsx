import { Button } from '@/components/ui/button';
import { Tags, Settings2 } from 'lucide-react';
import { ConversationLabels, type Label } from './ConversationLabels';
import { LabelPicker } from './LabelPicker';

interface ContactLabelsSectionProps {
  conversationId: string;
  inboxLabels: Label[];
  assignedLabelIds: string[];
  onLabelsChanged?: () => void;
  onRemoveLabel: (labelId: string) => void;
  onManageLabels: () => void;
}

export const ContactLabelsSection = ({
  conversationId,
  inboxLabels,
  assignedLabelIds,
  onLabelsChanged,
  onRemoveLabel,
  onManageLabels,
}: ContactLabelsSectionProps) => {
  const assignedLabels = inboxLabels.filter(l => assignedLabelIds.includes(l.id));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
          <Tags className="w-3 h-3" />
          Etiquetas
        </label>
        <div className="flex items-center gap-0.5">
          {onLabelsChanged && (
            <LabelPicker
              conversationId={conversationId}
              inboxLabels={inboxLabels}
              assignedLabelIds={assignedLabelIds}
              onChanged={onLabelsChanged}
            />
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onManageLabels} title="Gerenciar etiquetas">
            <Settings2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <ConversationLabels labels={assignedLabels} size="md" onRemove={onRemoveLabel} />
      {assignedLabels.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma etiqueta</p>
      )}
    </div>
  );
};
