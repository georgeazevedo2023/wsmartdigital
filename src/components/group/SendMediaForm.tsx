import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Image, FileIcon, Upload, Send, X } from 'lucide-react';
import SendStatusModal, { SendStatus } from './SendStatusModal';

interface SendMediaFormProps {
  instanceToken: string;
  groupJid: string;
  onMediaSent?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const SendMediaForm = ({ instanceToken, groupJid, onMediaSent }: SendMediaFormProps) => {
  const [mediaType, setMediaType] = useState<'image' | 'file'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [filename, setFilename] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('Arquivo muito grande (máximo 10MB)');
      setSendStatus('error');
      return;
    }

    if (mediaType === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Tipo de imagem não suportado. Use JPG, PNG, GIF ou WebP');
      setSendStatus('error');
      return;
    }

    setSelectedFile(file);
    setFilename(file.name);

    // Create preview for images
    if (mediaType === 'image' && ALLOWED_IMAGE_TYPES.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFilename('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const finalMediaUrl = selectedFile ? await fileToBase64(selectedFile) : mediaUrl.trim();

    if (!finalMediaUrl) {
      setErrorMessage('Informe a URL ou selecione um arquivo');
      setSendStatus('error');
      return;
    }

    if (mediaType === 'file' && !filename.trim()) {
      setErrorMessage('Informe o nome do arquivo');
      setSendStatus('error');
      return;
    }

    setSendStatus('sending');
    setErrorMessage('');

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        setErrorMessage('Sessão expirada');
        setSendStatus('error');
        return;
      }

      // Use unified send-media action with proper mediaType
      const payload: Record<string, unknown> = {
        action: 'send-media',
        token: instanceToken,
        groupjid: groupJid,
        mediaUrl: finalMediaUrl,
        mediaType: mediaType === 'image' ? 'image' : 'document',
        caption: caption.trim(),
      };

      // For documents, add filename
      if (mediaType === 'file' && filename.trim()) {
        payload.filename = filename.trim();
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = errorData.error || errorData.message || 'Erro ao enviar mídia';
        
        // Improve error messages for common issues
        if (errorMsg.includes('certificate') || errorMsg.includes('tls')) {
          errorMsg = 'URL com certificado SSL inválido. Tente fazer upload direto ou usar outra URL.';
        } else if (errorMsg.includes('fetch') && errorMsg.includes('URL')) {
          errorMsg = 'Não foi possível acessar a URL. Verifique se o link é válido ou faça upload direto.';
        }
        
        throw new Error(errorMsg);
      }

      setSendStatus('success');
      
      // Clear form
      setMediaUrl('');
      setCaption('');
      setFilename('');
      clearFile();
      
      onMediaSent?.();
    } catch (error) {
      console.error('Error sending media:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao enviar mídia');
      setSendStatus('error');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCloseModal = () => {
    setSendStatus('idle');
    setErrorMessage('');
  };

  const canSend = (mediaUrl.trim() || selectedFile) && (mediaType === 'image' || filename.trim());

  return (
    <>
      <SendStatusModal
        status={sendStatus}
        message={errorMessage}
        onClose={handleCloseModal}
      />

      <div className="space-y-4">
        <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as 'image' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Imagem
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileIcon className="w-4 h-4" />
              Arquivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>URL da Imagem</Label>
              <Input
                placeholder="https://exemplo.com/imagem.jpg"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={!!selectedFile}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">OU</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Label>Selecionar do dispositivo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!mediaUrl}
              >
                <Upload className="w-4 h-4 mr-2" />
                Escolher Imagem
              </Button>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-48 rounded-lg border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6"
                  onClick={clearFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>URL do Arquivo</Label>
              <Input
                placeholder="https://exemplo.com/documento.pdf"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={!!selectedFile}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">OU</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              <Label>Selecionar do dispositivo</Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!mediaUrl}
              >
                <Upload className="w-4 h-4 mr-2" />
                Escolher Arquivo
              </Button>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileIcon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{selectedFile.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-6 h-6"
                  onClick={clearFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome do Arquivo *</Label>
              <Input
                placeholder="documento.pdf"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Caption (shared) */}
        <div className="space-y-2">
          <Label>Legenda (opcional)</Label>
          <Textarea
            placeholder="Adicione uma legenda..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[60px] resize-none"
            maxLength={1024}
          />
        </div>

        {/* Send button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={!canSend}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar {mediaType === 'image' ? 'Imagem' : 'Arquivo'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tamanho máximo: 10MB
        </p>
      </div>
    </>
  );
};

export default SendMediaForm;
