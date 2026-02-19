import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanCardItem, CardData } from './KanbanCardItem';

export interface ColumnData {
  id: string;
  name: string;
  color: string;
  position: number;
  automation_enabled: boolean;
  automation_message: string | null;
}

interface KanbanColumnProps {
  column: ColumnData;
  cards: CardData[];
  onCardClick: (card: CardData) => void;
  onAddCard: (columnId: string) => void;
  canAddCard?: boolean;
  onMoveCard: (cardId: string, direction: 'prev' | 'next') => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function KanbanColumn({ column, cards, onCardClick, onAddCard, canAddCard = false, onMoveCard, hasPrev, hasNext }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border bg-muted/30 transition-colors duration-150 min-w-[280px] max-w-[280px]',
        isOver ? 'border-primary/50 bg-primary/5' : 'border-border'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-sm font-semibold text-foreground">{column.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {cards.length}
          </span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 opacity-60 hover:opacity-100">
          <MoreVertical className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Cards area */}
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex flex-col gap-2 p-2 flex-1 min-h-[120px] transition-colors duration-150',
            isOver && 'bg-primary/5'
          )}
        >
          {cards.map(card => (
            <KanbanCardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onMoveCard={onMoveCard}
              hasPrev={hasPrev}
              hasNext={hasNext}
            />
          ))}

          {cards.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-6">
              <p className="text-xs text-muted-foreground">Sem cards aqui</p>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add card button — apenas para quem pode criar cards */}
      {canAddCard && (
        <div className="p-2 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-muted-foreground hover:text-foreground h-8 text-xs"
            onClick={() => onAddCard(column.id)}
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar card
          </Button>
        </div>
      )}
    </div>
  );
}
