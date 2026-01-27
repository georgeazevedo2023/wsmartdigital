import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users, 
  MessageSquare, 
  Image, 
  Video, 
  Mic, 
  FileIcon,
  ChevronDown,
  ChevronUp,
  Shield,
  StopCircle,
  Timer,
  RefreshCw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BroadcastLog {
  id: string;
  instance_id: string;
  instance_name: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  groups_targeted: number;
  recipients_targeted: number;
  recipients_success: number;
  recipients_failed: number;
  exclude_admins: boolean;
  random_delay: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

const BroadcastHistory = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['broadcast-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcast_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as BroadcastLog[];
    },
  });

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    return secs > 0 ? `${minutes}min ${secs}s` : `${minutes}min`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <StopCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const getMessageTypeIcon = (type: string) => {
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
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getDeliveryRate = (success: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((success / total) * 100);
  };

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Envios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Envios
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum envio realizado ainda</p>
            <p className="text-sm">Os envios aparecerão aqui</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                const deliveryRate = getDeliveryRate(log.recipients_success, log.recipients_targeted);
                
                return (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 bg-background/50 hover:bg-background/80 transition-colors"
                  >
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-full bg-primary/10">
                          {getMessageTypeIcon(log.message_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getStatusBadge(log.status)}
                            {log.random_delay && log.random_delay !== 'none' && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {log.random_delay === '5-10' ? '5-10s' : '10-20s'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.instance_name || log.instance_id} • {log.groups_targeted} grupo(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-3">
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {log.recipients_success}/{log.recipients_targeted}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {deliveryRate}% entregue
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatDistanceToNow(new Date(log.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Timer className="w-4 h-4" />
                            <span>Duração: {formatDuration(log.duration_seconds)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>
                              {log.exclude_admins ? 'Excluindo admins' : 'Todos os membros'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-green-600">{log.recipients_success} sucesso</span>
                            {log.recipients_failed > 0 && (
                              <>
                                <span className="text-muted-foreground mx-1">•</span>
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-red-600">{log.recipients_failed} falha</span>
                              </>
                            )}
                          </div>
                        </div>

                        {log.content && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                            <p className="text-muted-foreground text-xs mb-1">Mensagem:</p>
                            <p className="line-clamp-3">{log.content}</p>
                          </div>
                        )}

                        {log.error_message && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                            <p className="text-xs mb-1">Erro:</p>
                            <p>{log.error_message}</p>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground pt-1">
                          {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default BroadcastHistory;
