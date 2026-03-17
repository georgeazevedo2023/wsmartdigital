import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQrPolling } from '@/hooks/useQrPolling';
import { normalizeQrSrc, extractQrCode } from '@/lib/qrCodeUtils';

export interface Instance {
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

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

export const useInstances = () => {
  const { isSuperAdmin, user } = useAuth();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [selectedInstanceForAccess, setSelectedInstanceForAccess] = useState<Instance | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      const { data: instancesData, error } = await supabase
        .from('instances').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      if (instancesData && instancesData.length > 0) {
        const userIds = [...new Set(instancesData.map(i => i.user_id))];
        const { data: profilesData } = await supabase.from('user_profiles').select('id, full_name, email').in('id', userIds);
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        setInstances(instancesData.map(inst => ({ ...inst, user_profiles: profilesMap.get(inst.user_id) })) as Instance[]);
      } else {
        setInstances([]);
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  }, []);

  const qr = useQrPolling({ onConnected: fetchInstances });

  useEffect(() => {
    fetchInstances();
    if (isSuperAdmin) fetchUsers();
  }, [isSuperAdmin, fetchInstances]);

  // Status polling every 30s
  useEffect(() => {
    const updateStatus = async () => {
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

        const statusMap = new Map<string, { status: string; owner: string | null; profilePic: string | null }>();
        uazapiInstances.forEach((inst: any) => {
          statusMap.set(inst.id, {
            status: inst.status === 'connected' ? 'connected' : 'disconnected',
            owner: inst.owner || null,
            profilePic: inst.profilePicUrl || null,
          });
        });

        const updates: (() => Promise<void>)[] = [];
        const updatedInstances = instances.map((instance) => {
          const u = statusMap.get(instance.id);
          if (u && u.status !== instance.status) {
            updates.push(async () => {
              await supabase.from('instances').update({
                status: u.status,
                owner_jid: u.owner || instance.owner_jid,
                profile_pic_url: u.profilePic || instance.profile_pic_url,
              }).eq('id', instance.id);
            });
            return { ...instance, status: u.status, owner_jid: u.owner || instance.owner_jid, profile_pic_url: u.profilePic || instance.profile_pic_url };
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

    if (instances.length > 0) updateStatus();
    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, [instances.length > 0]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('user_profiles').select('id, email, full_name').order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) { toast.error('Digite um nome para a instância'); return; }
    const targetUserId = isSuperAdmin && selectedUserId ? selectedUserId : user?.id;
    if (!targetUserId) { toast.error('Usuário não identificado'); return; }

    setIsCreating(true);
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let token = '';
      for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ action: 'connect', instanceName: newInstanceName, token }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao criar instância');

      const instanceId = result.instance?.instanceId || `inst_${Date.now()}`;
      const { error: dbError } = await supabase.from('instances').insert({ id: instanceId, name: newInstanceName, token, user_id: targetUserId, status: 'disconnected' });
      if (dbError) throw dbError;

      await supabase.from('user_instance_access').insert({ instance_id: instanceId, user_id: targetUserId });

      toast.success('Instância criada com sucesso!');
      setIsCreateDialogOpen(false);
      setNewInstanceName('');
      setSelectedUserId('');
      fetchInstances();

      const qrData = extractQrCode(result);
      if (qrData) {
        const newInst: Instance = { id: instanceId, name: newInstanceName, token, user_id: targetUserId, status: 'disconnected', owner_jid: null, profile_pic_url: null };
        setSelectedInstance(newInst);
        qr.setQrCode(normalizeQrSrc(qrData));
        qr.setQrDialogOpen(true);
        qr.startPolling(token);
      }
    } catch (error: any) {
      console.error('Error creating instance:', error);
      toast.error(error.message || 'Erro ao criar instância');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async (instance: Instance) => {
    setSelectedInstance(instance);
    await qr.connect(instance.name, instance.token);
  };

  const handleCloseQrDialog = () => {
    qr.closeDialog();
    setSelectedInstance(null);
  };

  const handleGenerateNewQr = () => {
    if (selectedInstance) handleConnect(selectedInstance);
  };

  const handleDelete = async (instance: Instance) => {
    if (!confirm(`Tem certeza que deseja excluir a instância "${instance.name}"?`)) return;
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

  const handleManageAccess = (instance: Instance) => {
    setSelectedInstanceForAccess(instance);
    setIsAccessDialogOpen(true);
  };

  const filteredInstances = instances.filter(
    (i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.user_profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    isSuperAdmin,
    loading,
    searchQuery,
    setSearchQuery,
    filteredInstances,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isCreating,
    newInstanceName,
    setNewInstanceName,
    selectedUserId,
    setSelectedUserId,
    users,
    handleCreateInstance,
    isSyncDialogOpen,
    setIsSyncDialogOpen,
    fetchInstances,
    isAccessDialogOpen,
    setIsAccessDialogOpen,
    selectedInstanceForAccess,
    // QR — delegated from useQrPolling
    qrDialogOpen: qr.qrDialogOpen,
    selectedInstance,
    qrCode: qr.qrCode,
    isLoadingQr: qr.isLoadingQr,
    handleConnect,
    handleCloseQrDialog,
    handleGenerateNewQr,
    handleDelete,
    handleManageAccess,
  };
};
