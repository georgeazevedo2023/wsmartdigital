import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, QrCode, Clock, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

interface InstanceHistoryProps {
  instance: Instance;
}

// Eventos mockados - podem ser substituídos por dados reais de uma tabela de logs
const getMockEvents = (instance: Instance) => {
  const events = [
    {
      id: '1',
      type: 'created',
      title: 'Instância Criada',
      description: `A instância ${instance.name} foi criada no sistema`,
      timestamp: instance.created_at,
      icon: QrCode,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  // Adicionar evento de conexão se estiver conectado
  if (instance.status === 'connected' && instance.owner_jid) {
    events.push({
      id: '2',
      type: 'connected',
      title: 'Conectado ao WhatsApp',
      description: `Conectado ao número +${instance.owner_jid.split('@')[0]}`,
      timestamp: instance.updated_at,
      icon: Wifi,
      color: 'text-success',
      bgColor: 'bg-success/10',
    });
  }

  // Adicionar evento de desconexão se desconectado mas tem owner_jid (já foi conectado antes)
  if (instance.status === 'disconnected' && instance.owner_jid) {
    events.push({
      id: '3',
      type: 'disconnected',
      title: 'Desconectado',
      description: 'A conexão com o WhatsApp foi perdida',
      timestamp: instance.updated_at,
      icon: WifiOff,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const InstanceHistory = ({ instance }: InstanceHistoryProps) => {
  const events = getMockEvents(instance);

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico de Conexões
          </CardTitle>
          <CardDescription>
            Registro de eventos e alterações de status da instância
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />

        {/* Eventos */}
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4 pl-2">
              {/* Ícone do evento */}
              <div
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 border-background ${event.bgColor}`}
              >
                <event.icon className={`w-4 h-4 ${event.color}`} />
              </div>

              {/* Conteúdo do evento */}
              <Card className="flex-1">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Nota informativa */}
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">
              O histórico completo de conexões será implementado em uma próxima atualização.
              Por enquanto, são exibidos os eventos principais baseados nos dados atuais da instância.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstanceHistory;
