import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface UazapiInstance {
  id: string;
  instanceName: string;
  token: string;
  connectionStatus: string;
  ownerJid?: string;
  profilePicUrl?: string;
  profileName?: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface SyncInstancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: () => void;
}

export default function SyncInstancesDialog({
  open,
  onOpenChange,
  onSync,
}: SyncInstancesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uazapiInstances, setUazapiInstances] = useState<UazapiInstance[]>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [userAssignments, setUserAssignments] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSelectedInstances(new Set());
    setUserAssignments({});

    try {
      // Fetch existing instances from local DB
      const { data: existingInstances } = await supabase
        .from('instances')
        .select('id');

      setExistingIds(new Set(existingInstances?.map((i) => i.id) || []));

      // Fetch users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .order('full_name');

      setUsers(usersData || []);

      // Fetch instances from UAZAPI
      const session = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({ action: 'list' }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar instâncias da UAZAPI');
      }

      // Handle different response formats from UAZAPI
      let instances: UazapiInstance[] = [];
      
      if (Array.isArray(result)) {
        instances = result.map((inst: any) => ({
          id: inst.id || inst.instanceId || inst.key,
          instanceName: inst.instanceName || inst.name || inst.key,
          token: inst.token || '',
          connectionStatus: inst.connectionStatus || inst.status || 'disconnected',
          ownerJid: inst.ownerJid || inst.owner?.jid,
          profilePicUrl: inst.profilePicUrl || inst.profilePic,
          profileName: inst.profileName || inst.pushname,
        }));
      } else if (result.instances && Array.isArray(result.instances)) {
        instances = result.instances.map((inst: any) => ({
          id: inst.id || inst.instanceId || inst.key,
          instanceName: inst.instanceName || inst.name || inst.key,
          token: inst.token || '',
          connectionStatus: inst.connectionStatus || inst.status || 'disconnected',
          ownerJid: inst.ownerJid || inst.owner?.jid,
          profilePicUrl: inst.profilePicUrl || inst.profilePic,
          profileName: inst.profileName || inst.pushname,
        }));
      }

      setUazapiInstances(instances);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const toggleInstance = (id: string) => {
    setSelectedInstances((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const setUserForInstance = (instanceId: string, userId: string) => {
    setUserAssignments((prev) => ({
      ...prev,
      [instanceId]: userId,
    }));
  };

  const handleSync = async () => {
    const toSync = uazapiInstances.filter(
      (inst) => selectedInstances.has(inst.id) && !existingIds.has(inst.id)
    );

    // Validate all selected instances have user assignments
    const missingAssignments = toSync.filter((inst) => !userAssignments[inst.id]);
    if (missingAssignments.length > 0) {
      toast.error('Atribua um usuário a todas as instâncias selecionadas');
      return;
    }

    setSyncing(true);

    try {
      const inserts = toSync.map((inst) => ({
        id: inst.id,
        name: inst.instanceName,
        token: inst.token,
        status: inst.connectionStatus === 'open' ? 'connected' : 'disconnected',
        owner_jid: inst.ownerJid || null,
        profile_pic_url: inst.profilePicUrl || null,
        user_id: userAssignments[inst.id],
      }));

      const { error: insertError } = await supabase.from('instances').insert(inserts);

      if (insertError) throw insertError;

      toast.success(`${inserts.length} instância(s) importada(s) com sucesso!`);
      onSync();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error syncing instances:', err);
      toast.error(err.message || 'Erro ao sincronizar instâncias');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const isConnected = status === 'open' || status === 'connected';
    return (
      <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
        {isConnected ? (
          <CheckCircle2 className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {isConnected ? 'Conectado' : 'Desconectado'}
      </Badge>
    );
  };

  const newInstances = uazapiInstances.filter((inst) => !existingIds.has(inst.id));
  const existingInBoth = uazapiInstances.filter((inst) => existingIds.has(inst.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Sincronizar Instâncias da UAZAPI
          </DialogTitle>
          <DialogDescription>
            Importe instâncias existentes da UAZAPI e atribua a usuários do sistema
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Buscando instâncias da UAZAPI...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-destructive">
            <AlertCircle className="w-8 h-8 mb-4" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchData} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        ) : uazapiInstances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mb-4 opacity-50" />
            <p>Nenhuma instância encontrada na UAZAPI</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6">
              {/* New instances */}
              {newInstances.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Novas Instâncias ({newInstances.length})
                  </h3>
                  {newInstances.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                    >
                      <Checkbox
                        checked={selectedInstances.has(inst.id)}
                        onCheckedChange={() => toggleInstance(inst.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {inst.profileName || inst.instanceName}
                          </span>
                          {getStatusBadge(inst.connectionStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {inst.instanceName} • {inst.id}
                        </p>
                      </div>
                      {selectedInstances.has(inst.id) && (
                        <Select
                          value={userAssignments[inst.id] || ''}
                          onValueChange={(value) => setUserForInstance(inst.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Atribuir usuário" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Already synced */}
              {existingInBoth.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    Já Sincronizadas ({existingInBoth.length})
                  </h3>
                  {existingInBoth.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-muted/50 opacity-60"
                    >
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {inst.profileName || inst.instanceName}
                          </span>
                          {getStatusBadge(inst.connectionStatus)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {inst.instanceName} • Já existe no sistema
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSync}
            disabled={syncing || selectedInstances.size === 0}
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Importar {selectedInstances.size > 0 ? `(${selectedInstances.size})` : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
