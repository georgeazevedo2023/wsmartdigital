import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import type { ColumnData } from '@/components/kanban/KanbanColumn';
import type { CardData } from '@/components/kanban/KanbanCardItem';
import type { KanbanField } from '@/components/kanban/DynamicFormField';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

export interface BoardData {
  id: string;
  name: string;
  description: string | null;
  visibility: 'shared' | 'private';
  inbox_id: string | null;
  instance_id: string | null;
  created_by: string;
}

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
}

interface EntityValueOption {
  id: string;
  label: string;
}

export function useKanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isGerente } = useAuth();

  const [board, setBoard] = useState<BoardData | null>(null);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [fields, setFields] = useState<KanbanField[]>([]);
  const [entityValuesMap, setEntityValuesMap] = useState<Record<string, EntityValueOption[]>>({});
  const [entityValueLabels, setEntityValueLabels] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [directMemberRole, setDirectMemberRole] = useState<'editor' | 'viewer' | null>(null);

  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canAddCard = isSuperAdmin || isGerente || directMemberRole === 'editor';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const scrollBoard = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' });
  };

  useEffect(() => {
    if (boardId) loadAll();
  }, [boardId, user]);

  const loadEntityValues = async (bId: string): Promise<Record<string, string>> => {
    const { data: entitiesData } = await supabase
      .from('kanban_entities').select('id').eq('board_id', bId);

    if (!entitiesData?.length) {
      setEntityValuesMap({});
      setEntityValueLabels({});
      return {};
    }

    const { data: valuesData } = await supabase
      .from('kanban_entity_values')
      .select('id, entity_id, label')
      .in('entity_id', entitiesData.map(e => e.id))
      .order('position');

    const map: Record<string, EntityValueOption[]> = {};
    const labels: Record<string, string> = {};
    (valuesData || []).forEach(v => {
      if (!map[v.entity_id]) map[v.entity_id] = [];
      map[v.entity_id].push({ id: v.id, label: v.label });
      labels[v.id] = v.label;
    });

    setEntityValuesMap(map);
    setEntityValueLabels(labels);
    return labels;
  };

  const loadCards = async (boardData: BoardData, fieldsData: KanbanField[], evLabels?: Record<string, string>) => {
    if (!user) return;
    const labels = evLabels || entityValueLabels;

    let query = supabase.from('kanban_cards').select('*').eq('board_id', boardData.id).order('position');
    if (boardData.visibility === 'private' && !isSuperAdmin) {
      query = query.or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`);
    }

    const { data: rawCards } = await query;
    if (!rawCards) return;

    const cardIds = rawCards.map(c => c.id);
    const primaryField = fieldsData.find(f => f.is_primary);

    const allFieldsMap: Record<string, Record<string, string>> = {};
    if (cardIds.length > 0) {
      const { data: cardData } = await supabase
        .from('kanban_card_data').select('card_id, field_id, value').in('card_id', cardIds);
      (cardData || []).forEach(d => {
        if (!allFieldsMap[d.card_id]) allFieldsMap[d.card_id] = {};
        allFieldsMap[d.card_id][d.field_id] = d.value || '';
      });
    }

    const assigneeIds = [...new Set(rawCards.filter(c => c.assigned_to).map(c => c.assigned_to!))];
    let nameMap: Record<string, string> = {};
    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles').select('id, full_name, email').in('id', assigneeIds);
      (profiles || []).forEach(p => { nameMap[p.id] = p.full_name || p.email; });
    }

    const resolveDisplayValue = (field: KanbanField, rawValue: string): string =>
      field.field_type === 'entity_select' && rawValue ? (labels[rawValue] || rawValue) : rawValue;

    setCards(rawCards.map(c => {
      const cardFieldMap = allFieldsMap[c.id] || {};
      const fieldValuesArr = fieldsData
        .map(f => ({ name: f.name, value: resolveDisplayValue(f, cardFieldMap[f.id] || ''), isPrimary: f.is_primary, showOnCard: f.show_on_card ?? false }))
        .filter(fv => fv.value);
      const primaryRawValue = primaryField ? (cardFieldMap[primaryField.id] || '') : '';
      const primaryDisplayValue = primaryField ? resolveDisplayValue(primaryField, primaryRawValue) : undefined;

      return {
        id: c.id, title: c.title, column_id: c.column_id, board_id: c.board_id,
        assigned_to: c.assigned_to, tags: c.tags || [], position: c.position,
        notes: c.notes || null, assignedName: c.assigned_to ? nameMap[c.assigned_to] : undefined,
        primaryFieldValue: primaryDisplayValue || undefined, primaryFieldName: primaryField?.name,
        fieldValues: fieldValuesArr,
      };
    }));
  };

  const loadTeamMembers = async (boardData: BoardData) => {
    if (boardData.inbox_id) {
      const { data } = await supabase
        .from('inbox_users').select('user_profiles(id, full_name, email)').eq('inbox_id', boardData.inbox_id);
      const members = (data || []).map((d: any) => d.user_profiles).filter(Boolean) as TeamMember[];
      setTeamMembers([...new Map(members.map(m => [m.id, m])).values()]);
    } else {
      const { data: memberRows } = await supabase
        .from('kanban_board_members').select('user_id').eq('board_id', boardData.id);
      const memberIds = (memberRows || []).map(r => r.user_id);
      if (memberIds.length === 0) { setTeamMembers([]); return; }
      const { data: profiles } = await supabase
        .from('user_profiles').select('id, full_name, email').in('id', memberIds).order('full_name');
      setTeamMembers((profiles || []) as TeamMember[]);
    }
  };

  const loadAll = async () => {
    if (!boardId || !user) return;
    setLoading(true);

    const [boardRes, colRes, fieldRes, memberRes] = await Promise.all([
      supabase.from('kanban_boards').select('*').eq('id', boardId).single(),
      supabase.from('kanban_columns').select('*').eq('board_id', boardId).order('position'),
      supabase.from('kanban_fields').select('*').eq('board_id', boardId).order('position'),
      supabase.from('kanban_board_members').select('role').eq('board_id', boardId).eq('user_id', user.id).maybeSingle(),
    ]);

    if (boardRes.error || !boardRes.data) {
      toast.error('Quadro não encontrado');
      navigate('/dashboard/crm');
      return;
    }

    const boardData = boardRes.data as BoardData;
    setBoard(boardData);
    setColumns((colRes.data || []) as ColumnData[]);

    const parsedFields = (fieldRes.data || []).map(f => ({
      ...f, options: f.options ? (f.options as string[]) : null,
      show_on_card: f.show_on_card ?? false, entity_id: (f as any).entity_id ?? null,
    })) as KanbanField[];
    setFields(parsedFields);
    setDirectMemberRole(memberRes.data ? (memberRes.data.role as 'editor' | 'viewer') : null);

    const evLabels = await loadEntityValues(boardData.id);
    await loadCards(boardData, parsedFields, evLabels);
    await loadTeamMembers(boardData);
    setLoading(false);
  };

  // ── Drag & Drop ──
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCard(cards.find(c => c.id === event.active.id) || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const ac = cards.find(c => c.id === active.id);
    if (!ac) return;
    const overId = over.id as string;
    const overCol = columns.find(col => col.id === overId);
    if (overCol && ac.column_id !== overCol.id) {
      setCards(prev => prev.map(c => c.id === ac.id ? { ...c, column_id: overCol.id } : c));
      return;
    }
    const overCard = cards.find(c => c.id === overId);
    if (overCard && overCard.column_id !== ac.column_id) {
      setCards(prev => prev.map(c => c.id === ac.id ? { ...c, column_id: overCard.column_id } : c));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeCardData = cards.find(c => c.id === activeId);
    if (!activeCardData) return;

    let newColumnId = activeCardData.column_id;
    const overColumn = columns.find(col => col.id === overId);
    if (overColumn) newColumnId = overColumn.id;
    const overCard = cards.find(c => c.id === overId);
    if (overCard) newColumnId = overCard.column_id;

    const colCards = cards.filter(c => c.column_id === newColumnId);
    const oldIdx = colCards.findIndex(c => c.id === activeId);
    const newIdx = overCard ? colCards.findIndex(c => c.id === overId) : colCards.length - 1;

    let reordered = colCards;
    if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
      reordered = arrayMove(colCards, oldIdx, newIdx);
    }

    const otherCards = cards.filter(c => c.column_id !== newColumnId && c.id !== activeId);
    setCards([...otherCards, ...reordered.map((c, i) => ({ ...c, column_id: newColumnId, position: i }))]);

    await supabase.from('kanban_cards').update({ column_id: newColumnId }).eq('id', activeId);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('kanban_cards').update({ position: i }).eq('id', reordered[i].id);
    }

    const targetCol = columns.find(c => c.id === newColumnId);
    if (targetCol?.automation_enabled && targetCol.automation_message && board?.instance_id) {
      toast.info(`Automação ativa: coluna "${targetCol.name}"`, { description: 'Configure o disparo na Etapa 4.' });
    }
  };

  const handleAddCard = async (columnId: string, title: string) => {
    if (!title.trim() || !user || !boardId) return;
    const colCards = cards.filter(c => c.column_id === columnId);
    const autoAssign = board?.visibility === 'private' ? user.id : null;

    const { error } = await supabase.from('kanban_cards').insert({
      board_id: boardId, column_id: columnId, title: title.trim(),
      created_by: user.id, assigned_to: autoAssign, position: colCards.length, tags: [],
    });
    if (error) { toast.error('Erro ao criar card'); return; }
    toast.success('Card criado!');
    loadAll();
  };

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card);
    setSheetOpen(true);
  };

  const handleMoveCard = async (cardId: string, direction: 'prev' | 'next') => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const sortedCols = [...columns].sort((a, b) => a.position - b.position);
    const currentIdx = sortedCols.findIndex(c => c.id === card.column_id);
    const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (targetIdx < 0 || targetIdx >= sortedCols.length) return;

    const targetCol = sortedCols[targetIdx];
    const targetColCards = cards.filter(c => c.column_id === targetCol.id);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: targetCol.id, position: targetColCards.length } : c));

    await supabase.from('kanban_cards').update({ column_id: targetCol.id, position: targetColCards.length }).eq('id', cardId);

    if (targetCol.automation_enabled && targetCol.automation_message && board?.instance_id) {
      toast.info(`Automação ativa: coluna "${targetCol.name}"`);
    }
  };

  // ── Filtering ──
  const searchFiltered = search
    ? cards.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
        (c.assignedName || '').toLowerCase().includes(search.toLowerCase()))
    : cards;

  const filteredCards = filterAssignee
    ? searchFiltered.filter(c => c.assigned_to === filterAssignee)
    : searchFiltered;

  const getColumnCards = (colId: string) =>
    filteredCards.filter(c => c.column_id === colId).sort((a, b) => a.position - b.position);

  const membersWithCards = teamMembers.filter(m => cards.some(c => c.assigned_to === m.id));

  return {
    board, columns, cards, fields, entityValuesMap, teamMembers,
    loading, search, setSearch, filterAssignee, setFilterAssignee,
    directMemberRole, selectedCard, sheetOpen, setSheetOpen,
    activeCard, scrollRef, canAddCard, sensors, filteredCards,
    scrollBoard, handleDragStart, handleDragOver, handleDragEnd,
    handleAddCard, handleCardClick, handleMoveCard, getColumnCards,
    membersWithCards, loadAll, navigate,
  };
}
