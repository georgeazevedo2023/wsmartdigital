import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import type { ResendData } from '@/hooks/useLeadsBroadcaster';

interface ResendBannerProps {
  resendData: ResendData;
  onCancel: () => void;
}

const ResendBanner = ({ resendData, onCancel }: ResendBannerProps) => (
  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Reenviando mensagem</span>
        <Badge variant="secondary" className="text-xs">
          {resendData.messageType === 'text' ? 'Texto' :
           resendData.messageType === 'carousel' ? 'Carrossel' :
           resendData.messageType === 'image' ? 'Imagem' :
           resendData.messageType === 'video' ? 'Vídeo' :
           resendData.messageType === 'audio' || resendData.messageType === 'ptt' ? 'Áudio' : 'Documento'}
        </Badge>
      </div>
      <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">
        Cancelar
      </Button>
    </div>
    {resendData.content && (
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        "{resendData.content}"
      </p>
    )}
  </div>
);

export default ResendBanner;
