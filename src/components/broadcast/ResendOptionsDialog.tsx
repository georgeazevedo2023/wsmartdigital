import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Users, User, ShieldOff, Send } from 'lucide-react';

interface ResendOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: {
    destination: 'groups' | 'leads';
    excludeAdmins: boolean;
  }) => void;
  messageType: string;
  originalTarget: 'groups' | 'leads';
}

const ResendOptionsDialog = ({
  open,
  onOpenChange,
  onConfirm,
  messageType,
  originalTarget,
}: ResendOptionsDialogProps) => {
  const [destination, setDestination] = useState<'groups' | 'leads'>(originalTarget);
  const [excludeAdmins, setExcludeAdmins] = useState(false);

  const handleConfirm = () => {
    onConfirm({ destination, excludeAdmins });
    onOpenChange(false);
  };

  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return 'Imagem';
      case 'video':
        return 'Vídeo';
      case 'audio':
      case 'ptt':
        return 'Áudio';
      case 'document':
        return 'Documento';
      case 'carousel':
        return 'Carrossel';
      default:
        return 'Texto';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Opções de Reenvio
          </DialogTitle>
          <DialogDescription>
            Escolha o destino e configurações para reenviar a mensagem ({getMessageTypeLabel(messageType)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Destination Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Destino</Label>
            <RadioGroup
              value={destination}
              onValueChange={(value) => setDestination(value as 'groups' | 'leads')}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="groups"
                  id="groups"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="groups"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <Users className="w-6 h-6" />
                  <span className="font-medium">Grupos</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="leads"
                  id="leads"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="leads"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                >
                  <User className="w-6 h-6" />
                  <span className="font-medium">Leads</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Exclude Admins Toggle - Only for Groups */}
          {destination === 'groups' && (
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShieldOff className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="exclude-admins" className="font-medium cursor-pointer">
                    Excluir Admins/Owners
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enviar apenas para membros comuns
                  </p>
                </div>
              </div>
              <Switch
                id="exclude-admins"
                checked={excludeAdmins}
                onCheckedChange={setExcludeAdmins}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            <Send className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResendOptionsDialog;
