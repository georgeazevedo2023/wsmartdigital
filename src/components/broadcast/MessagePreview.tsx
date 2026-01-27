import { useState, useEffect, useRef } from 'react';
import { Eye, FileIcon, Mic, PlayCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagePreviewProps {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  mediaUrl?: string;
  previewUrl?: string | null;
  filename?: string;
  isPtt?: boolean;
  onTextChange?: (newText: string) => void;
  disabled?: boolean;
}

const formatWhatsAppText = (text: string): React.ReactNode[] => {
  // Regex para encontrar *texto* (negrito do WhatsApp)
  const boldRegex = /\*([^*]+)\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Adicionar texto antes do match
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${keyIndex++}`}>{text.slice(lastIndex, match.index)}</span>);
    }
    // Adicionar texto em negrito
    parts.push(
      <strong key={`bold-${keyIndex++}`} className="font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  
  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${keyIndex++}`}>{text.slice(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : [<span key="full">{text}</span>];
};

const MessagePreview = ({ 
  type, 
  text, 
  mediaUrl, 
  previewUrl, 
  filename, 
  isPtt,
  onTextChange,
  disabled = false
}: MessagePreviewProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const hasContent = text?.trim() || mediaUrl?.trim() || previewUrl;
  
  // Sincronizar quando text muda externamente
  useEffect(() => {
    if (!isEditing) {
      setEditText(text || '');
    }
  }, [text, isEditing]);

  // Auto-focus e auto-resize do textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  // Auto-resize enquanto digita
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editText !== text && onTextChange) {
      onTextChange(editText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape cancela a edição
    if (e.key === 'Escape') {
      setEditText(text || '');
      setIsEditing(false);
    }
    // Enter mantém quebra de linha (comportamento padrão)
  };

  const startEditing = () => {
    if (!disabled && onTextChange) {
      setIsEditing(true);
    }
  };
  
  if (!hasContent && !onTextChange) return null;
  
  const imageSource = previewUrl || mediaUrl;
  const currentTime = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const canEdit = !disabled && onTextChange;
  const showEmptyState = !hasContent && canEdit;

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span>Preview da mensagem</span>
        {canEdit && !isEditing && (
          <span className="text-xs opacity-70">(clique para editar)</span>
        )}
        {isEditing && (
          <span className="text-xs text-primary">(editando...)</span>
        )}
      </div>
      
      <div className="bg-muted/30 rounded-lg p-4 flex justify-end">
        {/* Balão de mensagem estilo WhatsApp (remetente) */}
        <div className="max-w-[85%] bg-primary/10 rounded-lg rounded-tr-none p-3 shadow-sm border border-border/30">
          {/* Media preview */}
          {type === 'image' && imageSource && (
            <img 
              src={imageSource} 
              alt="Preview" 
              className="rounded-md max-h-48 w-auto mb-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          
          {type === 'video' && (previewUrl || mediaUrl) && (
            <div className="relative mb-2">
              {previewUrl ? (
                <video 
                  src={previewUrl} 
                  className="rounded-md max-h-48 w-auto"
                />
              ) : (
                <div className="bg-muted rounded-md h-32 w-48 flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-background/80 flex items-center justify-center">
                  <PlayCircle className="w-6 h-6 text-foreground" />
                </div>
              </div>
            </div>
          )}
          
          {type === 'audio' && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2 mb-2 min-w-[200px]">
              <Mic className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 h-1 bg-muted-foreground/30 rounded-full">
                <div className="h-full w-1/3 bg-primary rounded-full" />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {isPtt ? '0:00' : (filename || 'audio')}
              </span>
            </div>
          )}
          
          {type === 'file' && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-md px-4 py-3 mb-2">
              <FileIcon className="w-8 h-8 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {filename || 'documento'}
                </p>
              </div>
            </div>
          )}
          
          {/* Texto ou legenda - editável */}
          <div 
            onClick={startEditing}
            className={cn(
              "text-sm whitespace-pre-wrap break-words transition-colors min-h-[1.5em]",
              canEdit && !isEditing && "cursor-pointer hover:bg-primary/5 rounded px-1 -mx-1",
              showEmptyState && "min-h-[40px]"
            )}
          >
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={handleTextChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[40px] focus:ring-0"
                placeholder="Digite sua mensagem..."
              />
            ) : (
              text ? (
                <span className="flex items-start gap-1">
                  <span className="flex-1">{formatWhatsAppText(text)}</span>
                  {canEdit && (
                    <Pencil className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-0.5" />
                  )}
                </span>
              ) : (
                canEdit && (
                  <span className="text-muted-foreground/60 italic flex items-center gap-1">
                    <span>Clique para adicionar texto...</span>
                    <Pencil className="w-3 h-3" />
                  </span>
                )
              )
            )}
          </div>
          
          {/* Timestamp */}
          <div className="flex justify-end items-center gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {currentTime}
            </span>
            <span className="text-[10px] text-primary">✓✓</span>
          </div>
        </div>
      </div>

      {/* Dica de formatação quando editando */}
      {isEditing && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <span>💡</span>
          <span>
            Use <code className="bg-muted px-1 rounded text-[10px]">*texto*</code> para <strong>negrito</strong> • Enter para quebra de linha
          </span>
        </p>
      )}
    </div>
  );
};

export default MessagePreview;
