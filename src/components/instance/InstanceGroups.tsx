import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Users, Search, RefreshCw, MessageSquare, WifiOff } from 'lucide-react';

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

interface Group {
  id: string;
  name: string;
  subject: string;
  pictureUrl?: string;
  participants: Participant[];
  size: number;
}

interface Participant {
  id: string;
  name?: string;
  admin?: string;
}

interface InstanceGroupsProps {
  instance: Instance;
}

const InstanceGroups = ({ instance }: InstanceGroupsProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const isConnected = instance.status === 'connected' || instance.status === 'online';

  useEffect(() => {
    if (isConnected) {
      fetchGroups();
    } else {
      setLoading(false);
    }
  }, [instance.id, isConnected]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            action: 'groups',
            token: instance.token,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar grupos');
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        const formattedGroups: Group[] = data.map((group: any) => ({
          id: group.id || group.jid,
          name: group.name || group.subject || 'Grupo sem nome',
          subject: group.subject || group.name || '',
          pictureUrl: group.pictureUrl || group.profilePicUrl,
          participants: group.participants || [],
          size: group.size || group.participants?.length || 0,
        }));
        setGroups(formattedGroups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
    toast.success('Grupos atualizados');
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPhone = (jid: string) => {
    const phone = jid?.split('@')[0];
    if (!phone) return 'Desconhecido';
    return `+${phone}`;
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <WifiOff className="w-16 h-16 text-muted-foreground" />
          <h3 className="text-lg font-medium">Instância Desconectada</h3>
          <p className="text-muted-foreground text-center">
            Conecte a instância para visualizar os grupos do WhatsApp
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com busca */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar grupos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Contador de grupos */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <MessageSquare className="w-3 h-3" />
          {filteredGroups.length} grupo{filteredGroups.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Lista de grupos */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Users className="w-16 h-16 text-muted-foreground" />
            <h3 className="text-lg font-medium">Nenhum grupo encontrado</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm
                ? 'Tente ajustar sua busca'
                : 'Esta instância não participa de nenhum grupo'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {filteredGroups.map((group) => (
            <AccordionItem
              key={group.id}
              value={group.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="w-12 h-12 border">
                    <AvatarImage src={group.pictureUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Users className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium">{group.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {group.size} participante{group.size !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="pt-2 border-t">
                  <h5 className="text-sm font-medium mb-3">
                    Participantes ({group.participants.length})
                  </h5>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {group.participants.map((participant, idx) => (
                        <div
                          key={participant.id || idx}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-secondary text-xs">
                                {participant.name?.charAt(0)?.toUpperCase() ||
                                  formatPhone(participant.id).charAt(1)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {participant.name || formatPhone(participant.id)}
                              </p>
                              {participant.name && (
                                <p className="text-xs text-muted-foreground">
                                  {formatPhone(participant.id)}
                                </p>
                              )}
                            </div>
                          </div>
                          {participant.admin && (
                            <Badge variant="outline" className="text-xs">
                              {participant.admin === 'superadmin' ? 'Dono' : 'Admin'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};

export default InstanceGroups;
