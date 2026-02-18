import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Users, Lock } from 'lucide-react';

interface KanbanBoard {
  id: string;
  name: string;
  description: string | null;
  visibility: 'shared' | 'private';
  inbox_id: string | null;
  instance_id: string | null;
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  automation_enabled: boolean;
  automation_message: string | null;
}

interface KanbanField {
  id: string;
  name: string;
  field_type: 'text' | 'currency' | 'date' | 'select';
  options: string[] | null;
  position: number;
  is_primary: boolean;
  required: boolean;
}

interface Inbox {
  id: string;
  name: string;
  instance_id: string;
}

interface EditBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: KanbanBoard;
  inboxes: Inbox[];
  onSaved: () => void;
}

const COLUMN_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
];

const FIELD_TYPES = [
  { value: 'text', label: 'Texto Curto' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção' },
];

export function EditBoardDialog({ open, onOpenChange, board, inboxes, onSaved }: EditBoardDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || '');
  const [visibility, setVisibility] = useState<'shared' | 'private'>(board.visibility);
  const [inboxId, setInboxId] = useState<string>(board.inbox_id || 'none');
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [fields, setFields] = useState<KanbanField[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && board.id) {
      loadBoardData();
    }
  }, [open, board.id]);

  const loadBoardData = async () => {
    setLoading(true);
    const [colRes, fieldRes] = await Promise.all([
      supabase.from('kanban_columns').select('*').eq('board_id', board.id).order('position'),
      supabase.from('kanban_fields').select('*').eq('board_id', board.id).order('position'),
    ]);
    if (colRes.data) setColumns(colRes.data as KanbanColumn[]);
    if (fieldRes.data) {
      setFields(fieldRes.data.map(f => ({
        ...f,
        options: f.options ? (f.options as string[]) : null,
      })) as KanbanField[]);
    }
    setLoading(false);
  };

  // ── Columns ──────────────────────────────────────────────
  const addColumn = () => {
    const newCol: KanbanColumn = {
      id: `new_${Date.now()}`,
      name: 'Nova Coluna',
      color: COLUMN_COLORS[columns.length % COLUMN_COLORS.length],
      position: columns.length,
      automation_enabled: false,
      automation_message: null,
    };
    setColumns(prev => [...prev, newCol]);
  };

  const updateColumn = (id: string, patch: Partial<KanbanColumn>) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const removeColumn = (id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const moveColumn = (id: string, dir: 'up' | 'down') => {
    setColumns(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // ── Fields ───────────────────────────────────────────────
  const addField = () => {
    const newField: KanbanField = {
      id: `new_${Date.now()}`,
      name: 'Novo Campo',
      field_type: 'text',
      options: null,
      position: fields.length,
      is_primary: fields.length === 0,
      required: false,
    };
    setFields(prev => [...prev, newField]);
  };

  const updateField = (id: string, patch: Partial<KanbanField>) => {
    setFields(prev => prev.map(f => {
      if (f.id === id) return { ...f, ...patch };
      // Only one primary
      if (patch.is_primary && f.id !== id) return { ...f, is_primary: false };
      return f;
    }));
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const moveField = (id: string, dir: 'up' | 'down') => {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (dir === 'up' && idx === 0) return prev;
      if (dir === 'down' && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  // ── Save ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const selectedInbox = inboxId !== 'none' ? inboxes.find(i => i.id === inboxId) : null;

    // 1. Update board
    const { error: boardErr } = await supabase
      .from('kanban_boards')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        visibility,
        inbox_id: selectedInbox?.id || null,
        instance_id: selectedInbox?.instance_id || null,
      })
      .eq('id', board.id);

    if (boardErr) {
      toast.error('Erro ao salvar quadro');
      setSaving(false);
      return;
    }

    // 2. Sync columns: delete removed, upsert existing/new
    const existingColIds = columns.filter(c => !c.id.startsWith('new_')).map(c => c.id);
    // Delete removed columns
    const { data: dbCols } = await supabase
      .from('kanban_columns')
      .select('id')
      .eq('board_id', board.id);

    const dbColIds = (dbCols || []).map((c: any) => c.id);
    const toDelete = dbColIds.filter((id: string) => !existingColIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('kanban_columns').delete().in('id', toDelete);
    }

    // Upsert columns
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const isNew = col.id.startsWith('new_');
      if (isNew) {
        await supabase.from('kanban_columns').insert({
          board_id: board.id,
          name: col.name,
          color: col.color,
          position: i,
          automation_enabled: col.automation_enabled,
          automation_message: col.automation_message,
        });
      } else {
        await supabase.from('kanban_columns').update({
          name: col.name,
          color: col.color,
          position: i,
          automation_enabled: col.automation_enabled,
          automation_message: col.automation_message,
        }).eq('id', col.id);
      }
    }

    // 3. Sync fields
    const existingFieldIds = fields.filter(f => !f.id.startsWith('new_')).map(f => f.id);
    const { data: dbFields } = await supabase
      .from('kanban_fields')
      .select('id')
      .eq('board_id', board.id);

    const dbFieldIds = (dbFields || []).map((f: any) => f.id);
    const fieldsToDelete = dbFieldIds.filter((id: string) => !existingFieldIds.includes(id));
    if (fieldsToDelete.length > 0) {
      await supabase.from('kanban_fields').delete().in('id', fieldsToDelete);
    }

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const isNew = field.id.startsWith('new_');
      const payload = {
        board_id: board.id,
        name: field.name,
        field_type: field.field_type,
        options: field.options as any,
        position: i,
        is_primary: field.is_primary,
        required: field.required,
      };
      if (isNew) {
        await supabase.from('kanban_fields').insert(payload);
      } else {
        await supabase.from('kanban_fields').update(payload).eq('id', field.id);
      }
    }

    setSaving(false);
    toast.success('Quadro salvo com sucesso!');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Editar Quadro</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="colunas">Colunas</TabsTrigger>
            <TabsTrigger value="campos">Campos do Formulário</TabsTrigger>
          </TabsList>

          {/* ── Aba Geral ── */}
          <TabsContent value="geral" className="space-y-4 mt-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <Label>Nome do Quadro *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Privacidade dos Leads</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('shared')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    visibility === 'shared'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs font-medium">Compartilhado</span>
                  <span className="text-[10px] opacity-70">Todo mundo vê tudo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                    visibility === 'private'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-border/80'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span className="text-xs font-medium">Individual</span>
                  <span className="text-[10px] opacity-70">Só vê seus leads</span>
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Caixa de Entrada WhatsApp (opcional)</Label>
              <Select value={inboxId} onValueChange={setInboxId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem conexão WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem conexão WhatsApp</SelectItem>
                  {inboxes.map(inbox => (
                    <SelectItem key={inbox.id} value={inbox.id}>{inbox.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* ── Aba Colunas ── */}
          <TabsContent value="colunas" className="flex flex-col flex-1 min-h-0 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Defina as etapas do seu funil</p>
              <Button size="sm" variant="outline" onClick={addColumn} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {loading && <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>}
              {!loading && columns.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma coluna. Clique em Adicionar para começar.</p>
              )}
              {columns.map((col, idx) => (
                <div key={col.id} className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
                  {/* Color picker */}
                  <div className="shrink-0 mt-1">
                    <div className="flex flex-wrap gap-1 w-24">
                      {COLUMN_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-4 h-4 rounded-full transition-transform ${col.color === color ? 'ring-2 ring-offset-1 ring-foreground scale-125' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateColumn(col.id, { color })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={col.name}
                      onChange={e => updateColumn(col.id, { name: e.target.value })}
                      placeholder="Nome da coluna"
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`auto_${col.id}`}
                        checked={col.automation_enabled}
                        onCheckedChange={v => updateColumn(col.id, { automation_enabled: v })}
                      />
                      <Label htmlFor={`auto_${col.id}`} className="text-xs">Mensagem automática ao mover</Label>
                    </div>
                    {col.automation_enabled && (
                      <Textarea
                        value={col.automation_message || ''}
                        onChange={e => updateColumn(col.id, { automation_message: e.target.value })}
                        placeholder="Olá {{nome}}, seu status foi atualizado! Use {{campo:NOME}} para dados do lead."
                        rows={2}
                        className="text-xs"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveColumn(col.id, 'up')} disabled={idx === 0}>
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveColumn(col.id, 'down')} disabled={idx === columns.length - 1}>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeColumn(col.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ── Aba Campos ── */}
          <TabsContent value="campos" className="flex flex-col flex-1 min-h-0 mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Campos do formulário de cada lead</p>
              <Button size="sm" variant="outline" onClick={addField} className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {loading && <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>}
              {!loading && fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum campo. Clique em Adicionar para começar.</p>
              )}
              {fields.map((field, idx) => (
                <div key={field.id} className="p-3 rounded-lg border border-border bg-card space-y-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      value={field.name}
                      onChange={e => updateField(field.id, { name: e.target.value })}
                      placeholder="Nome do campo"
                      className="h-8 text-sm flex-1"
                    />
                    <Select value={field.field_type} onValueChange={v => updateField(field.id, { field_type: v as any })}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveField(field.id, 'up')} disabled={idx === 0}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => moveField(field.id, 'down')} disabled={idx === fields.length - 1}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => removeField(field.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {field.field_type === 'select' && (
                    <div className="pl-6">
                      <Input
                        value={field.options?.join(', ') || ''}
                        onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Opção 1, Opção 2, Opção 3"
                        className="h-7 text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Separe as opções por vírgula</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 pl-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`primary_${field.id}`}
                        checked={field.is_primary}
                        onCheckedChange={v => updateField(field.id, { is_primary: v })}
                      />
                      <Label htmlFor={`primary_${field.id}`} className="text-xs">Campo principal (exibe no card)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`required_${field.id}`}
                        checked={field.required}
                        onCheckedChange={v => updateField(field.id, { required: v })}
                      />
                      <Label htmlFor={`required_${field.id}`} className="text-xs">Obrigatório</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
