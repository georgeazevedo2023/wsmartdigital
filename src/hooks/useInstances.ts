import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const normalizeQrSrc = (qr: string): string =>
  qr.startsWith('data:image') ? qr : `data:image/png;base64,${qr}`;

const extractQrCode = (data: any): string | null =>
  data?.instance?.qrcode || data?.qrcode || data?.base64 || null;

const checkIfConnected = (data: any): boolean =>
  data?.instance?.status === 'connected' ||
  data?.status === 'connected' ||
  data?.status?.connected === true ||
  data?.loggedIn === true;

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

  // QR Code state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInstances();
    if (isSuperAdmin) fetchUsers();
  }, [isSuperAdmin]);

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => {
    if (!qrDialogOpen && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [qrDialogOpen]);

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

  const fetchInstances = async () => {
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
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('user_profiles').select('id, email, full_name').order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const startPolling = useCallback((instance: Instance) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session.access_token}` },
            body: JSON.stringify({ action: 'status', token: instance.token }),
          }
        );

        const data = await response.json();
        if (checkIfConnected(data)) {
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          toast.success('Conectado com sucesso!');
          setQrDialogOpen(false);
          setQrCode(null);
          setSelectedInstance(null);
          fetchInstances();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  }, []);

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

      const qr = extractQrCode(result);
      if (qr) {
        const newInst: Instance = { id: instanceId, name: newInstanceName, token, user_id: targetUserId, status: 'disconnected', owner_jid: null, profile_pic_url: null };
        setSelectedInstance(newInst);
        setQrCode(normalizeQrSrc(qr));
        setQrDialogOpen(true);
        startPolling(newInst);
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
    setQrDialogOpen(true);
    setIsLoadingQr(true);
    setQrCode(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ action: 'connect', instanceName: instance.name, token: instance.token }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao conectar');

      if (checkIfConnected(result)) {
        toast.success('Instância já está conectada!');
        setQrDialogOpen(false);
        fetchInstances();
        return;
      }

      const qr = extractQrCode(result);
      if (qr) {
        setQrCode(normalizeQrSrc(qr));
        startPolling(instance);
      } else {
        toast.error('Não foi possível gerar o QR Code');
      }
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast.error(error.message || 'Erro ao gerar QR Code');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleCloseQrDialog = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setQrDialogOpen(false);
    setQrCode(null);
    setSelectedInstance(null);
  };

  const handleGenerateNewQr = () => { if (selectedInstance) handleConnect(selectedInstance); };

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
    // Create dialog
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    isCreating,
    newInstanceName,
    setNewInstanceName,
    selectedUserId,
    setSelectedUserId,
    users,
    handleCreateInstance,
    // Sync
    isSyncDialogOpen,
    setIsSyncDialogOpen,
    fetchInstances,
    // Access
    isAccessDialogOpen,
    setIsAccessDialogOpen,
    selectedInstanceForAccess,
    // QR
    qrDialogOpen,
    selectedInstance,
    qrCode,
    isLoadingQr,
    handleConnect,
    handleCloseQrDialog,
    handleGenerateNewQr,
    // Actions
    handleDelete,
    handleManageAccess,
  };
};
