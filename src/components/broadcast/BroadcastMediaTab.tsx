import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { Image, Video, Mic, FileIcon, Upload, X } from 'lucide-react';
import type { MediaType } from '@/hooks/useBroadcastForm';

interface BroadcastMediaTabProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  mediaUrl: string;
  onMediaUrlChange: (url: string) => void;
  selectedFile: File | null;
  previewUrl: string | null;
  caption: string;
  onCaptionChange: (cap: string) => void;
  isPtt: boolean;
  onIsPttChange: (ptt: boolean) => void;
  filename: string;
  onFilenameChange: (name: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  getAcceptedTypes: () => string;
  disabled: boolean;
}

const MEDIA_OPTIONS: { type: MediaType; icon: typeof Image; label: string }[] = [
  { type: 'image', icon: Image, label: 'Imagem' },
  { type: 'video', icon: Video, label: 'Vídeo' },
  { type: 'audio', icon: Mic, label: 'Áudio' },
  { type: 'file', icon: FileIcon, label: 'Arquivo' },
];

const BroadcastMediaTab = ({
  mediaType, onMediaTypeChange, mediaUrl, onMediaUrlChange,
  selectedFile, previewUrl, caption, onCaptionChange,
  isPtt, onIsPttChange, filename, onFilenameChange,
  fileInputRef, onFileSelect, onClearFile, getAcceptedTypes, disabled,
}: BroadcastMediaTabProps) => {
  return (
    <div className="space-y-4">
      {/* Media Type Selector */}
      <div className="grid grid-cols-4 gap-2">
        {MEDIA_OPTIONS.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            type="button"
            variant={mediaType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => { onMediaTypeChange(type); onClearFile(); }}
            disabled={disabled}
            className="flex flex-col items-center gap-1 h-auto py-2"
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <Label>URL da mídia</Label>
        <Input
          placeholder="https://exemplo.com/arquivo.jpg"
          value={mediaUrl}
          onChange={(e) => onMediaUrlChange(e.target.value)}
          disabled={disabled || !!selectedFile}
        />
      </div>

      {/* Separator */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {/* File Input */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypes()}
          onChange={onFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || !!mediaUrl.trim()}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          Escolher do dispositivo
        </Button>
      </div>

      {/* Preview */}
      {selectedFile && (
        <div className="relative border border-border rounded-lg p-3 bg-muted/30">
          <Button
            type="button" variant="ghost" size="icon"
            onClick={onClearFile}
            className="absolute top-1 right-1 h-6 w-6"
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>

          {mediaType === 'image' && previewUrl && (
            <img src={previewUrl} alt="Preview" className="max-h-40 rounded mx-auto" />
          )}
          {mediaType === 'video' && previewUrl && (
            <video src={previewUrl} controls className="max-h-40 rounded mx-auto" />
          )}
          {mediaType === 'audio' && previewUrl && (
            <audio src={previewUrl} controls className="w-full" />
          )}
          {mediaType === 'file' && (
            <div className="flex items-center gap-2">
              <FileIcon className="w-8 h-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filename for documents */}
      {mediaType === 'file' && (
        <div className="space-y-2">
          <Label>Nome do arquivo</Label>
          <Input
            placeholder="documento.pdf"
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}

      {/* PTT Toggle for audio */}
      {mediaType === 'audio' && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="ptt-toggle" className="text-sm font-medium cursor-pointer">
                Enviar como mensagem de voz
              </Label>
              <p className="text-xs text-muted-foreground">Aparecerá como áudio gravado no WhatsApp</p>
            </div>
          </div>
          <Switch id="ptt-toggle" checked={isPtt} onCheckedChange={onIsPttChange} disabled={disabled} />
        </div>
      )}

      {/* Caption */}
      <div className="space-y-2">
        <Label>Legenda (opcional)</Label>
        <Textarea
          placeholder="Adicione uma legenda..."
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          disabled={disabled}
          className="min-h-[80px] resize-none"
        />
        <EmojiPicker onEmojiSelect={(emoji) => onCaptionChange(caption + emoji)} disabled={disabled} />
      </div>
    </div>
  );
};

export default BroadcastMediaTab;
