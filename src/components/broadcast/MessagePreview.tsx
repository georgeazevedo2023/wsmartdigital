import { Eye, FileIcon, Mic, PlayCircle } from 'lucide-react';

interface MessagePreviewProps {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  mediaUrl?: string;
  previewUrl?: string | null;
  filename?: string;
  isPtt?: boolean;
}

const MessagePreview = ({ type, text, mediaUrl, previewUrl, filename, isPtt }: MessagePreviewProps) => {
  const hasContent = text?.trim() || mediaUrl?.trim() || previewUrl;
  
  if (!hasContent) return null;
  
  const imageSource = previewUrl || mediaUrl;
  const currentTime = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span>Preview da mensagem</span>
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
          
          {/* Texto ou legenda */}
          {text && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {text}
            </p>
          )}
          
          {/* Timestamp */}
          <div className="flex justify-end items-center gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {currentTime}
            </span>
            <span className="text-[10px] text-primary">✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePreview;
