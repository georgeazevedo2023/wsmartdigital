import { useState, useMemo } from 'react';
import EmptyState from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  FileText, Image, Video, Mic, FileIcon, FolderOpen, Plus, Trash2,
  Loader2, Search, X, Pencil, BookMarked, LayoutGrid, List, Copy,
} from 'lucide-react';
import { MessageTemplate, useMessageTemplates } from '@/hooks/useMessageTemplates';
import { CarouselEditor, type CarouselData } from '@/components/broadcast/CarouselEditor';
import { uploadCarouselImage } from '@/lib/uploadCarouselImage';
import { toast } from 'sonner';

const MEDIA_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-4 h-4" />, video: <Video className="w-4 h-4" />,
  audio: <Mic className="w-4 h-4" />, ptt: <Mic className="w-4 h-4" />,
  document: <FileIcon className="w-4 h-4" />, carousel: <FolderOpen className="w-4 h-4" />,
};
const getMediaIcon = (type: string) => MEDIA_ICONS[type] || <FileText className="w-4 h-4" />;

const MEDIA_LABELS: Record<string, string> = {
  image: 'Imagem', video: 'Vídeo', audio: 'Áudio', ptt: 'Voz', document: 'Documento', carousel: 'Carrossel',
};
const getMediaLabel = (type: string) => MEDIA_LABELS[type] || 'Texto';

const getTypeBadgeVariant = (type: string) => {
  if (type === 'carousel') return 'default';
  if (type === 'image' || type === 'video') return 'secondary';
  return 'outline';
};

/** Reusable category selector used in both Create and Edit dialogs */
const CategorySelector = ({ value, onChange, categories, showNew, setShowNew, newValue, setNewValue }: {
  value: string; onChange: (v: string) => void; categories: string[];
  showNew: boolean; setShowNew: (v: boolean) => void; newValue: string; setNewValue: (v: string) => void;
}) => (
  <div className="space-y-2">
    <Label>Categoria (opcional)</Label>
    {!showNew ? (
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem categoria</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={() => setShowNew(true)}><Plus className="w-4 h-4" /></Button>
      </div>
    ) : (
      <div className="flex gap-2">
        <Input placeholder="Nova categoria..." value={newValue} onChange={e => setNewValue(e.target.value)} />
        <Button type="button" variant="outline" size="icon" onClick={() => { setShowNew(false); setNewValue(''); }}><X className="w-4 h-4" /></Button>
      </div>
    )}
  </div>
);

/** Template action buttons (duplicate, edit, delete) */
const TemplateActions = ({ template, onDuplicate, onEdit, onDelete }: {
  template: MessageTemplate; onDuplicate: () => void; onEdit: () => void; onDelete: () => void;
}) => (
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicar"><Copy className="w-3.5 h-3.5" /></Button>
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Excluir"><Trash2 className="w-3.5 h-3.5" /></Button>
  </div>
);

export default function TemplatesManager() {
  const { templates, categories, isLoading, createTemplate, updateTemplate, deleteTemplate } = useMessageTemplates();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createType, setCreateType] = useState('text');
  const [createMediaUrl, setCreateMediaUrl] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [createNewCategory, setCreateNewCategory] = useState('');
  const [showCreateNewCategory, setShowCreateNewCategory] = useState(false);
  const [createCarouselData, setCreateCarouselData] = useState<CarouselData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Edit dialog state
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNewCategory, setEditNewCategory] = useState('');
  const [showEditNewCategory, setShowEditNewCategory] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deletingTemplate, setDeletingTemplate] = useState<MessageTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    if (filterCategory === 'uncategorized') filtered = filtered.filter(t => !t.category);
    else if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    if (filterType !== 'all') filtered = filtered.filter(t => t.message_type === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
    }
    return filtered;
  }, [templates, searchQuery, filterType, filterCategory]);

  const resetCreateForm = () => {
    setCreateName(''); setCreateContent(''); setCreateType('text'); setCreateMediaUrl('');
    setCreateCategory(''); setCreateNewCategory(''); setShowCreateNewCategory(false); setCreateCarouselData(null);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    if (createType === 'carousel' && (!createCarouselData || createCarouselData.cards.length < 2)) {
      toast.error('Carrossel precisa de no mínimo 2 cards'); return;
    }
    setIsSaving(true);
    const finalCategory = showCreateNewCategory ? createNewCategory.trim() : (createCategory === '__none__' ? '' : createCategory);
    let carouselToSave = createCarouselData;
    if (createType === 'carousel' && carouselToSave) {
      try {
        const updatedCards = await Promise.all(
          carouselToSave.cards.map(async (card) => {
            if (card.imageFile) { const url = await uploadCarouselImage(card.imageFile); return { ...card, image: url, imageFile: undefined }; }
            return { ...card, imageFile: undefined };
          })
        );
        carouselToSave = { ...carouselToSave, cards: updatedCards };
      } catch { toast.error('Erro ao fazer upload das imagens do carrossel'); setIsSaving(false); return; }
    }
    const result = await createTemplate({
      name: createName.trim(), content: createType === 'text' ? createContent : createContent || undefined,
      message_type: createType, media_url: createMediaUrl || undefined,
      category: finalCategory || undefined, carousel_data: carouselToSave || undefined,
    });
    setIsSaving(false);
    if (result) { setShowCreateDialog(false); resetCreateForm(); }
  };

  const openEdit = (template: MessageTemplate) => {
    setEditingTemplate(template); setEditName(template.name); setEditContent(template.content || '');
    setEditCategory(template.category || ''); setEditNewCategory(''); setShowEditNewCategory(false);
  };

  const handleUpdate = async () => {
    if (!editingTemplate || !editName.trim()) return;
    const finalCategory = showEditNewCategory ? editNewCategory.trim() : (editCategory === '__none__' ? '' : editCategory);
    setIsUpdating(true);
    const success = await updateTemplate(editingTemplate.id, { name: editName.trim(), content: editContent || undefined, category: finalCategory || null });
    setIsUpdating(false);
    if (success) setEditingTemplate(null);
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    setIsDeleting(true);
    await deleteTemplate(deletingTemplate.id);
    setIsDeleting(false);
    setDeletingTemplate(null);
  };

  const handleDuplicate = async (template: MessageTemplate) => {
    const result = await createTemplate({
      name: `${template.name} (cópia)`, content: template.content || undefined,
      message_type: template.message_type, media_url: template.media_url || undefined,
      filename: template.filename || undefined, category: template.category || undefined,
      carousel_data: template.carousel_data || undefined,
    });
    if (result) toast.success('Template duplicado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-primary" /> Templates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Crie e gerencie templates de texto, mídia e carrossel para usar nos disparos.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus className="w-4 h-4 mr-2" /> Novo Template</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar templates..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-9" />
          {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}><X className="w-4 h-4" /></Button>}
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="uncategorized">Sem categoria</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="image">Imagem</SelectItem>
            <SelectItem value="video">Vídeo</SelectItem>
            <SelectItem value="audio">Áudio</SelectItem>
            <SelectItem value="document">Documento</SelectItem>
            <SelectItem value="carousel">Carrossel</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-0.5">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title={templates.length === 0 ? 'Nenhum template criado' : 'Nenhum template encontrado'}
          description={templates.length === 0 ? 'Crie seu primeiro template para começar.' : 'Tente ajustar os filtros.'}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(t => (
            <Card key={t.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">{getMediaIcon(t.message_type)}<span className="font-medium truncate">{t.name}</span></div>
                  <TemplateActions template={t} onDuplicate={() => handleDuplicate(t)} onEdit={() => openEdit(t)} onDelete={() => setDeletingTemplate(t)} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getTypeBadgeVariant(t.message_type) as any}>{getMediaLabel(t.message_type)}</Badge>
                  {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                </div>
                {t.content && <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.content}</p>}
                {t.message_type === 'carousel' && t.carousel_data && <div className="text-xs text-muted-foreground">{(t.carousel_data as any).cards?.length || 0} cards</div>}
                {t.media_url && t.message_type === 'image' && <img src={t.media_url} alt={t.name} className="w-full h-32 object-cover rounded-md" />}
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent/50 transition-colors group">
              <div className="shrink-0">{getMediaIcon(t.message_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{t.name}</span>
                  <Badge variant={getTypeBadgeVariant(t.message_type) as any} className="text-xs">{getMediaLabel(t.message_type)}</Badge>
                  {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                </div>
                {t.content && <p className="text-sm text-muted-foreground truncate mt-0.5">{t.content}</p>}
              </div>
              <TemplateActions template={t} onDuplicate={() => handleDuplicate(t)} onEdit={() => openEdit(t)} onDelete={() => setDeletingTemplate(t)} />
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={open => { if (!open) resetCreateForm(); setShowCreateDialog(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Template</DialogTitle>
            <DialogDescription>Crie um novo template para reutilizar nos disparos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Boas-vindas, Promoção..." value={createName} onChange={e => setCreateName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={createType} onValueChange={v => { setCreateType(v); setCreateCarouselData(null); setCreateMediaUrl(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem><SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem><SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="document">Documento</SelectItem><SelectItem value="carousel">Carrossel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo / Legenda</Label>
              <Textarea placeholder={createType === 'text' ? 'Digite o texto da mensagem...' : 'Legenda (opcional)...'} value={createContent} onChange={e => setCreateContent(e.target.value)} rows={4} />
            </div>
            {['image', 'video', 'audio', 'document'].includes(createType) && (
              <div className="space-y-2"><Label>URL da mídia</Label><Input placeholder="https://..." value={createMediaUrl} onChange={e => setCreateMediaUrl(e.target.value)} /></div>
            )}
            {createType === 'carousel' && (
              <div className="space-y-2">
                <Label>Cards do Carrossel</Label>
                <CarouselEditor value={createCarouselData || { cards: [], message: '' }} onChange={val => setCreateCarouselData(val)} />
              </div>
            )}
            <CategorySelector value={createCategory} onChange={setCreateCategory} categories={categories}
              showNew={showCreateNewCategory} setShowNew={setShowCreateNewCategory} newValue={createNewCategory} setNewValue={setCreateNewCategory} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isSaving || !createName.trim()}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={open => { if (!open) setEditingTemplate(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <DialogDescription>Altere o nome, conteúdo ou categoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            {editingTemplate && (editingTemplate.message_type === 'text' || editingTemplate.content) && (
              <div className="space-y-2"><Label>Conteúdo</Label><Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4} /></div>
            )}
            <CategorySelector value={editCategory || '__none__'} onChange={setEditCategory} categories={categories}
              showNew={showEditNewCategory} setShowNew={setShowEditNewCategory} newValue={editNewCategory} setNewValue={setEditNewCategory} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={isUpdating || !editName.trim()}>
              {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingTemplate} onOpenChange={open => { if (!open) setDeletingTemplate(null); }}
        title="Excluir template?"
        description={`O template "${deletingTemplate?.name}" será excluído permanentemente. Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete} isLoading={isDeleting} confirmLabel="Excluir" destructive
      />
    </div>
  );
}
