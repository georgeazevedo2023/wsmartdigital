import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Search, Kanban, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanColumn } from '@/components/kanban/KanbanColumn';
import { KanbanCardItem } from '@/components/kanban/KanbanCardItem';
import { CardDetailSheet } from '@/components/kanban/CardDetailSheet';
import { useKanbanBoard } from '@/hooks/useKanbanBoard';

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

const KanbanBoard = () => {
  const {
    board, columns, cards, fields, entityValuesMap, teamMembers,
    loading, search, setSearch, filterAssignee, setFilterAssignee,
    directMemberRole, selectedCard, sheetOpen, setSheetOpen,
    activeCard, scrollRef, canAddCard, sensors, filteredCards,
    scrollBoard, handleDragStart, handleDragOver, handleDragEnd,
    handleAddCard, handleCardClick, handleMoveCard, getColumnCards,
    membersWithCards, loadAll, navigate,
  } = useKanbanBoard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard/crm')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Kanban className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">{board.name}</h1>
              {board.description && (
                <p className="text-xs text-muted-foreground truncate hidden sm:block">{board.description}</p>
              )}
            </div>
          </div>
          <div className="flex-1" />
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar cards..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 w-48 text-sm" />
          </div>
          <span className="text-sm text-muted-foreground shrink-0">
            {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}
          </span>
          {directMemberRole === 'viewer' && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
              👁️ Visualizador
            </span>
          )}
        </div>

        {/* Assignee filter chips */}
        {membersWithCards.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0">Filtrar:</span>
            {membersWithCards.map(m => {
              const name = m.full_name || m.email;
              const count = cards.filter(c => c.assigned_to === m.id).length;
              const isActive = filterAssignee === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setFilterAssignee(isActive ? null : m.id)}
                  className={cn(
                    'flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border text-xs font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  <Avatar className="w-4 h-4 shrink-0">
                    <AvatarFallback className={cn('text-xs', isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary/10 text-primary')}>
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{name.split(' ')[0]}</span>
                  <span className={cn('px-1 rounded-full text-xs', isActive ? 'bg-primary-foreground/20' : 'bg-muted')}>{count}</span>
                </button>
              );
            })}
            {filterAssignee && (
              <button onClick={() => setFilterAssignee(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div className="relative flex-1 overflow-hidden">
        <button onClick={() => scrollBoard('left')} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-card/90 border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-card active:scale-95 transition-all md:hidden" aria-label="Rolar para esquerda">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scrollBoard('right')} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-card/90 border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-card active:scale-95 transition-all md:hidden" aria-label="Rolar para direita">
          <ChevronRight className="w-4 h-4" />
        </button>

        <div ref={scrollRef} className="h-full overflow-x-auto overflow-y-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 p-4 h-full min-h-[calc(100vh-10rem)]">
              {columns.map((col, colIdx) => (
                <KanbanColumn
                  key={col.id} column={col} cards={getColumnCards(col.id)}
                  onCardClick={handleCardClick} onAddCard={handleAddCard}
                  canAddCard={canAddCard} onMoveCard={handleMoveCard}
                  hasPrev={colIdx > 0} hasNext={colIdx < columns.length - 1}
                />
              ))}
              {columns.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <Kanban className="w-12 h-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground text-sm">
                      Este quadro ainda não tem colunas.<br />
                      <span className="text-primary cursor-pointer hover:underline" onClick={() => navigate('/dashboard/crm')}>Edite o quadro</span> para adicionar etapas ao funil.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <DragOverlay>
              {activeCard && <KanbanCardItem card={activeCard} onClick={() => {}} isDragging />}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <CardDetailSheet
        card={selectedCard} open={sheetOpen} onOpenChange={setSheetOpen}
        columns={columns} fields={fields} teamMembers={teamMembers}
        entityValuesMap={entityValuesMap} onSaved={loadAll} onDeleted={loadAll}
      />
    </div>
  );
};

export default KanbanBoard;
