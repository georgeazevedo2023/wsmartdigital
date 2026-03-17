import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, QrCode as QrCodeIcon, User, Calendar, Key, Phone, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBR } from '@/lib/dateUtils';
import { QrCodeDialog } from './QrCodeDialog';
import { useQrPolling } from '@/hooks/useQrPolling';

interface Instance {
  id: string;
  name: string;
  status: string;
  token: string;
  owner_jid: string | null;
  profile_pic_url: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface InstanceOverviewProps {
  instance: Instance;
  onUpdate: () => void;
}

const InstanceOverview = ({ instance, onUpdate }: InstanceOverviewProps) => {
  const [showToken, setShowToken] = useState(false);

  const qr = useQrPolling({ onConnected: onUpdate });

  const isConnected = instance.status === 'connected' || instance.status === 'online';
  const phoneNumber = instance.owner_jid?.split('@')[0];

  const copyToken = () => {
    navigator.clipboard.writeText(instance.token);
    toast.success('Token copiado para a área de transferência');
  };

  const handleConnect = () => {
    qr.connect(instance.name, instance.token);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Informações da Instância */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Informações da Instância
          </CardTitle>
          <CardDescription>Dados principais da conexão WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">Nome</Label>
            <p className="font-medium">{instance.name}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">Status</Label>
            <Badge
              variant="outline"
              className={cn(
                'gap-1.5',
                isConnected
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive'
              )}
            >
              {isConnected ? (
                <><Wifi className="w-3 h-3" /> Conectado</>
              ) : (
                <><WifiOff className="w-3 h-3" /> Desconectado</>
              )}
            </Badge>
          </div>

          {phoneNumber && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase">Telefone</Label>
              <p className="font-medium">+{phoneNumber}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">ID da Instância</Label>
            <p className="font-mono text-sm text-muted-foreground">{instance.id}</p>
          </div>

          {!isConnected && (
            <Button onClick={handleConnect} className="w-full mt-4">
              <QrCodeIcon className="w-4 h-4 mr-2" />
              Conectar via QR Code
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Token e Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Token de Acesso
          </CardTitle>
          <CardDescription>Token para autenticação na API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">Token</Label>
            <div className="flex gap-2">
              <Input type={showToken ? 'text' : 'password'} value={instance.token} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => setShowToken(!showToken)}>
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={copyToken}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Proprietário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Proprietário
          </CardTitle>
          <CardDescription>Usuário responsável pela instância</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">Nome</Label>
            <p className="font-medium">{instance.user_profiles?.full_name || 'Não informado'}</p>
          </div>
          {instance.user_profiles?.email && (
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase">Email</Label>
              <p className="text-sm text-muted-foreground">{instance.user_profiles.email}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Datas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Datas
          </CardTitle>
          <CardDescription>Informações de criação e atualização</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">Criado em</Label>
            <p className="font-medium">{formatBR(instance.created_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase">Última atualização</Label>
            <p className="font-medium">{formatBR(instance.updated_at, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}</p>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog — reusable component */}
      <QrCodeDialog
        open={qr.qrDialogOpen}
        onClose={qr.closeDialog}
        instanceName={instance.name}
        qrCode={qr.qrCode}
        isLoading={qr.isLoadingQr}
        onGenerateNew={handleConnect}
      />
    </div>
  );
};

export default InstanceOverview;
