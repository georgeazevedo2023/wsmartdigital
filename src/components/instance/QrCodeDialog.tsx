import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { QrCode, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QrCodeDialogProps {
  open: boolean;
  onClose: () => void;
  instanceName?: string;
  qrCode: string | null;
  isLoading: boolean;
  onGenerateNew: () => void;
}

export const QrCodeDialog = ({
  open, onClose, instanceName, qrCode, isLoading, onGenerateNew,
}: QrCodeDialogProps) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Conectar {instanceName}
        </DialogTitle>
        <DialogDescription>
          Escaneie o QR Code com seu WhatsApp para conectar
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center justify-center p-6 gap-4">
        {isLoading ? (
          <div className="w-64 h-64 bg-muted animate-pulse rounded-lg flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Gerando QR Code...</span>
            </div>
          </div>
        ) : qrCode ? (
          <>
            <img src={qrCode} alt="QR Code" className="w-64 h-64 rounded-lg border" />
            <p className="text-sm text-muted-foreground text-center">
              Aguardando leitura do QR… (verificando status a cada 5s)
            </p>
          </>
        ) : (
          <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground text-center px-4">
              Erro ao gerar QR Code. Tente novamente.
            </span>
          </div>
        )}
      </div>
      <DialogFooter className="flex-row gap-2 sm:justify-center">
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button onClick={onGenerateNew} disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Gerar novo QR
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
