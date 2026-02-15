import { cn } from '@/lib/utils';

export interface Label {
  id: string;
  name: string;
  color: string;
  inbox_id: string;
}

interface ConversationLabelsProps {
  labels: Label[];
  size?: 'sm' | 'md';
  className?: string;
}

export const ConversationLabels = ({ labels, size = 'sm', className }: ConversationLabelsProps) => {
  if (labels.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {labels.map(label => (
        <span
          key={label.id}
          className={cn(
            'inline-flex items-center rounded-full font-medium border',
            size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
          )}
          style={{
            backgroundColor: `${label.color}20`,
            color: label.color,
            borderColor: `${label.color}40`,
          }}
        >
          {label.name}
        </span>
      ))}
    </div>
  );
};
