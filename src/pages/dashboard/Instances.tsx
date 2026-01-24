import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import InstanceCard from '@/components/dashboard/InstanceCard';
import SyncInstancesDialog from '@/components/dashboard/SyncInstancesDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Server, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Instance {
  id: string;
  name: string;
  status: string;
  token: string;
  owner_jid: string | null;
  profile_pic_url: string | null;
  user_id: string;
  user_profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

const Instances = () => {
  const { isSuperAdmin, user } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [currentQrCode, setCurrentQrCode] = useState<string | null>(null);
  const [loadingQrId, setLoadingQrId] = useState<string | null>(null);

  useEffect(() => {
    fetchInstances();
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  // Polling para atualizar status a cada 30 segundos
  useEffect(() => {
    const updateInstancesStatus = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
            body: JSON.stringify({ action: 'list' }),
          }
        );

        if (!response.ok) return;

        const uazapiInstances = await response.json();
        if (!Array.isArray(uazapiInstances)) return;

        // Criar mapa de status da UAZAPI
        const statusMap = new Map<string, { status: string; owner: string | null; profilePic: string | null }>();
        uazapiInstances.forEach((inst: any) => {
          statusMap.set(inst.id, {
            status: inst.status === 'connected' ? 'connected' : 'disconnected',
            owner: inst.owner || null,
            profilePic: inst.profilePicUrl || null,
          });
        });

        // Atualizar instâncias locais que têm status diferente
        const updates: (() => Promise<void>)[] = [];
        const updatedInstances = instances.map((instance) => {
          const uazapiStatus = statusMap.get(instance.id);
          if (uazapiStatus && uazapiStatus.status !== instance.status) {
            updates.push(async () => {
              await supabase
                .from('instances')
                .update({
                  status: uazapiStatus.status,
                  owner_jid: uazapiStatus.owner || instance.owner_jid,
                  profile_pic_url: uazapiStatus.profilePic || instance.profile_pic_url,
                })
                .eq('id', instance.id);
            });
            return {
              ...instance,
              status: uazapiStatus.status,
              owner_jid: uazapiStatus.owner || instance.owner_jid,
              profile_pic_url: uazapiStatus.profilePic || instance.profile_pic_url,
            };
          }
          return instance;
        });

        if (updates.length > 0) {
          await Promise.all(updates.map(fn => fn()));
          setInstances(updatedInstances);
        }
      } catch (error) {
        console.error('Error updating instances status:', error);
      }
    };

    // Atualizar status imediatamente ao carregar
    if (instances.length > 0) {
      updateInstancesStatus();
    }

    // Polling a cada 30 segundos
    const interval = setInterval(updateInstancesStatus, 30000);
    return () => clearInterval(interval);
  }, [instances.length > 0]); // Executar quando tiver instâncias

  const fetchInstances = async () => {
    try {
      // Fetch instances
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*')
        .order('created_at', { ascending: false });

      if (instancesError) throw instancesError;

      // Fetch user profiles for each instance
      if (instancesData && instancesData.length > 0) {
        const userIds = [...new Set(instancesData.map((i) => i.user_id))];
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

        const instancesWithProfiles = instancesData.map((instance) => ({
          ...instance,
          user_profiles: profilesMap.get(instance.user_id),
        }));

        setInstances(instancesWithProfiles as Instance[]);
      } else {
        setInstances([]);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    const targetUserId = isSuperAdmin && selectedUserId ? selectedUserId : user?.id;
    if (!targetUserId) {
      toast.error('Usuário não identificado');
      return;
    }

    setIsCreating(true);

    try {
      const token = generateToken();

      // Call UAZAPI to create instance
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'connect',
          instanceName: newInstanceName,
          token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar instância');
      }

      // Save to database
      const { error: dbError } = await supabase.from('instances').insert({
        id: result.instance?.instanceId || `inst_${Date.now()}`,
        name: newInstanceName,
        token,
        user_id: targetUserId,
        status: 'disconnected',
      });

      if (dbError) throw dbError;

      toast.success('Instância criada com sucesso!');
      setIsCreateDialogOpen(false);
      setNewInstanceName('');
      setSelectedUserId('');
      fetchInstances();

      // Show QR code if available
      if (result.qrcode) {
        setCurrentQrCode(result.qrcode);
      }
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error(error.message || 'Erro ao criar instância');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async (instance: Instance) => {
    setLoadingQrId(instance.id);
    setCurrentQrCode(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'connect',
          instanceName: instance.name,
          token: instance.token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao conectar');
      }

      if (result.qrcode) {
        setCurrentQrCode(result.qrcode);
      }
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast.error(error.message || 'Erro ao gerar QR Code');
    } finally {
      setLoadingQrId(null);
    }
  };

  const handleDelete = async (instance: Instance) => {
    if (!confirm(`Tem certeza que deseja excluir a instância "${instance.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('instances').delete().eq('id', instance.id);

      if (error) throw error;

      toast.success('Instância excluída com sucesso');
      fetchInstances();
    } catch (error) {
      console.error('Error deleting instance:', error);
      toast.error('Erro ao excluir instância');
    }
  };

  const filteredInstances = instances.filter(
    (instance) =>
      instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.user_profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Instâncias</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? 'Gerencie todas as instâncias do sistema'
              : 'Suas instâncias do WhatsApp'}
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Instância
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Instância</DialogTitle>
                  <DialogDescription>
                    Crie uma nova instância do WhatsApp e atribua a um usuário
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="instance-name">Nome da Instância</Label>
                    <Input
                      id="instance-name"
                      placeholder="Ex: Suporte - João"
                      value={newInstanceName}
                      onChange={(e) => setNewInstanceName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-select">Atribuir ao Usuário</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateInstance} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Instância'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Sync Dialog */}
        <SyncInstancesDialog
          open={isSyncDialogOpen}
          onOpenChange={setIsSyncDialogOpen}
          onSync={fetchInstances}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar instâncias..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Instances Grid */}
      {filteredInstances.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma instância encontrada</p>
          {isSuperAdmin && (
            <p className="text-sm mt-2">
              Clique em "Nova Instância" para criar uma
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInstances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              showOwner={isSuperAdmin}
              onConnect={handleConnect}
              onDelete={isSuperAdmin ? handleDelete : undefined}
              qrCode={currentQrCode || undefined}
              isLoadingQr={loadingQrId === instance.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Instances;
