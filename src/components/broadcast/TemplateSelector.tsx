import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BookmarkPlus, 
  FileText, 
  Image, 
  Video, 
  Mic, 
  FileIcon, 
  ChevronDown, 
  Trash2, 
  Loader2,
  BookMarked,
  Search,
  X
} from 'lucide-react';
import { MessageTemplate, useMessageTemplates } from '@/hooks/useMessageTemplates';

interface TemplateSelectorProps {
  onSelect: (template: MessageTemplate) => void;
  onSave: () => { 
    name: string; 
    content?: string; 
    message_type: string; 
    media_url?: string; 
    filename?: string; 
  } | null;
  disabled?: boolean;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case 'image':
      return <Image className="w-4 h-4" />;
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'audio':
    case 'ptt':
      return <Mic className="w-4 h-4" />;
    case 'document':
      return <FileIcon className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getMediaLabel = (type: string) => {
  switch (type) {
    case 'image':
      return 'Imagem';
    case 'video':
      return 'Vídeo';
    case 'audio':
      return 'Áudio';
    case 'ptt':
      return 'Voz';
    case 'document':
      return 'Documento';
    default:
      return 'Texto';
  }
};

export function TemplateSelector({ onSelect, onSave, disabled }: TemplateSelectorProps) {
  const { templates, isLoading, createTemplate, deleteTemplate } = useMessageTemplates();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by type
    if (filterType === 'text') {
      filtered = filtered.filter(t => t.message_type === 'text');
    } else if (filterType === 'media') {
      filtered = filtered.filter(t => t.message_type !== 'text');
    } else if (filterType !== 'all') {
      filtered = filtered.filter(t => t.message_type === filterType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) ||
        (t.content && t.content.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [templates, searchQuery, filterType]);

  const textTemplates = filteredTemplates.filter(t => t.message_type === 'text');
  const mediaTemplates = filteredTemplates.filter(t => t.message_type !== 'text');

  const handleSave = async () => {
    if (!templateName.trim()) return;

    const templateData = onSave();
    if (!templateData) return;

    setIsSaving(true);
    const result = await createTemplate({
      ...templateData,
      name: templateName.trim(),
    });
    setIsSaving(false);

    if (result) {
      setShowSaveDialog(false);
      setTemplateName('');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteTemplate(id);
    setDeletingId(null);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled || isLoading}>
              <BookMarked className="w-4 h-4 mr-2" />
              Templates
              {templates.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({templates.length})</span>
              )}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            {/* Search and Filter Header */}
            <div className="p-2 space-y-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 h-8 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="media">Mídia (todos)</SelectItem>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="ptt">Voz (PTT)</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum template salvo
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum template encontrado
              </div>
            ) : (
              <ScrollArea className="max-h-60">
                {textTemplates.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Texto
                    </DropdownMenuLabel>
                    {textTemplates.map((template) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{template.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, template.id)}
                          disabled={deletingId === template.id}
                        >
                          {deletingId === template.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 text-destructive" />
                          )}
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                {textTemplates.length > 0 && mediaTemplates.length > 0 && (
                  <DropdownMenuSeparator />
                )}

                {mediaTemplates.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Mídia
                    </DropdownMenuLabel>
                    {mediaTemplates.map((template) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => onSelect(template)}
                        className="flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getMediaIcon(template.message_type)}
                          <span className="truncate">{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({getMediaLabel(template.message_type)})
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, template.id)}
                          disabled={deletingId === template.id}
                        >
                          {deletingId === template.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3 text-destructive" />
                          )}
                        </Button>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          disabled={disabled}
          title="Salvar como template"
        >
          <BookmarkPlus className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como Template</DialogTitle>
            <DialogDescription>
              Dê um nome para este template para reutilizá-lo depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do template</Label>
              <Input
                id="template-name"
                placeholder="Ex: Boas-vindas, Promoção..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && templateName.trim()) {
                    handleSave();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!templateName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
