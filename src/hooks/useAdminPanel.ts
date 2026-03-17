import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AppRole, InboxRole, InboxWithDetails, UserWithRole, InboxUser } from '@/components/admin/types';

export const useAdminPanel = () => {
  const { isSuperAdmin, user } = useAuth();

  // Search / filter
  const [activeTab, setActiveTab] = useState('inboxes');
  const [inboxSearch, setInboxSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | AppRole>('all');

  // Data
  const [inboxes, setInboxes] = useState<InboxWithDetails[]>([]);
  const [inboxesLoading, setInboxesLoading] = useState(true);
  const [instances, setInstances] = useState<{ id: string; name: string; status: string }[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<InboxUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  // Create inbox
  const [isCreateInboxOpen, setIsCreateInboxOpen] = useState(false);
  const [isCreatingInbox, setIsCreatingInbox] = useState(false);
  const [newInboxName, setNewInboxName] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookOutgoingUrl, setWebhookOutgoingUrl] = useState('');

  // Create user
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('user');

  // Edit user
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Delete confirmations
  const [inboxToDelete, setInboxToDelete] = useState<InboxWithDetails | null>(null);
  const [isDeletingInbox, setIsDeletingInbox] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [removeMembership, setRemoveMembership] = useState<{ userId: string; inboxId: string; userName: string; inboxName: string } | null>(null);
  const [isRemovingMembership, setIsRemovingMembership] = useState(false);

  // Dialogs
  const [manageInbox, setManageInbox] = useState<InboxWithDetails | null>(null);
  const [manageInstancesUser, setManageInstancesUser] = useState<UserWithRole | null>(null);
  const [isManageInstancesOpen, setIsManageInstancesOpen] = useState(false);
  const [isCreateTeamUserOpen, setIsCreateTeamUserOpen] = useState(false);

  // ── Fetch ──
  const fetchInboxes = useCallback(async () => {
    setInboxesLoading(true);
    try {
      const { data: inboxData, error } = await supabase.from('inboxes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!inboxData?.length) { setInboxes([]); return; }
      const instanceIds = [...new Set(inboxData.map(i => i.instance_id))];
      const { data: instanceData } = await supabase.from('instances').select('id, name, status').in('id', instanceIds);
      const instanceMap = new Map((instanceData || []).map(i => [i.id, i]));
      const { data: memberData } = await supabase.from('inbox_users').select('inbox_id');
      const memberCounts = new Map<string, number>();
      (memberData || []).forEach(m => memberCounts.set(m.inbox_id, (memberCounts.get(m.inbox_id) || 0) + 1));
      setInboxes(inboxData.map(inbox => ({
        id: inbox.id, name: inbox.name, instance_id: inbox.instance_id,
        instance_name: instanceMap.get(inbox.instance_id)?.name || 'Instância removida',
        instance_status: instanceMap.get(inbox.instance_id)?.status || 'disconnected',
        created_by: inbox.created_by, created_at: inbox.created_at,
        member_count: memberCounts.get(inbox.id) || 0,
        webhook_url: (inbox as any).webhook_url || null,
        webhook_outgoing_url: (inbox as any).webhook_outgoing_url || null,
      })));
    } catch { toast.error('Erro ao carregar caixas'); }
    finally { setInboxesLoading(false); }
  }, []);

  const fetchInstances = useCallback(async () => {
    const { data } = await supabase.from('instances').select('id, name, status').order('name');
    if (data) setInstances(data);
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [profilesRes, rolesRes, accessRes, instRes] = await Promise.all([
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('user_instance_access').select('user_id, instance_id'),
        supabase.from('instances').select('id, name, owner_jid'),
      ]);
      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      const access = accessRes.data || [];
      const instMap = new Map((instRes.data || []).map(i => [i.id, i]));
      const resolveRole = (userId: string): AppRole => {
        const ur = roles.filter(r => r.user_id === userId).map(r => r.role);
        if (ur.includes('super_admin')) return 'super_admin';
        if (ur.includes('gerente')) return 'gerente';
        return 'user';
      };
      setUsers(profiles.map(p => {
        const userAccess = access.filter(a => a.user_id === p.id);
        const insts = userAccess.map(a => { const i = instMap.get(a.instance_id); return i ? { id: i.id, name: i.name, phone: i.owner_jid } : null; }).filter(Boolean) as UserWithRole['instances'];
        const role = resolveRole(p.id);
        return { ...p, is_super_admin: role === 'super_admin', app_role: role, instance_count: insts.length, instances: insts };
      }));
    } catch { toast.error('Erro ao carregar usuários'); }
    finally { setUsersLoading(false); }
  }, []);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const [profilesRes, inboxUsersRes, inboxesRes, instancesRes] = await Promise.all([
        supabase.from('user_profiles').select('id, email, full_name'),
        supabase.from('inbox_users').select('user_id, inbox_id, role'),
        supabase.from('inboxes').select('id, name, instance_id'),
        supabase.from('instances').select('id, name'),
      ]);
      const profiles = profilesRes.data || [];
      const inboxUsers = inboxUsersRes.data || [];
      const inboxMap = new Map((inboxesRes.data || []).map(ib => [ib.id, ib]));
      const instanceMap = new Map((instancesRes.data || []).map(i => [i.id, i]));
      const userIdsWithInbox = new Set(inboxUsers.map(iu => iu.user_id));
      setTeamUsers(profiles.filter(p => userIdsWithInbox.has(p.id)).map(profile => ({
        id: profile.id, email: profile.email, full_name: profile.full_name,
        memberships: inboxUsers.filter(iu => iu.user_id === profile.id).map(iu => {
          const inbox = inboxMap.get(iu.inbox_id);
          const instance = inbox ? instanceMap.get(inbox.instance_id) : undefined;
          return { inbox_id: iu.inbox_id, inbox_name: inbox?.name || 'Desconhecida', instance_name: instance?.name || '', role: iu.role as InboxRole };
        }),
      })));
    } catch { toast.error('Erro ao carregar equipe'); }
    finally { setTeamLoading(false); }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchInboxes(); fetchInstances(); fetchUsers(); fetchTeam();
  }, [isSuperAdmin, fetchInboxes, fetchInstances, fetchUsers, fetchTeam]);

  // ── Handlers ──
  const handleCreateInbox = async () => {
    if (!newInboxName.trim() || !selectedInstanceId) { toast.error('Preencha nome e instância'); return; }
    setIsCreatingInbox(true);
    try {
      const { error } = await supabase.from('inboxes').insert({ name: newInboxName.trim(), instance_id: selectedInstanceId, created_by: user!.id, webhook_url: webhookUrl.trim() || null, webhook_outgoing_url: webhookOutgoingUrl.trim() || null } as any);
      if (error) throw error;
      toast.success('Caixa criada!');
      setIsCreateInboxOpen(false); setNewInboxName(''); setSelectedInstanceId(''); setWebhookUrl(''); setWebhookOutgoingUrl('');
      fetchInboxes();
    } catch (e: any) { toast.error(e.message || 'Erro ao criar caixa'); }
    finally { setIsCreatingInbox(false); }
  };

  const handleDeleteInbox = async () => {
    if (!inboxToDelete) return;
    setIsDeletingInbox(true);
    try {
      await supabase.from('inbox_users').delete().eq('inbox_id', inboxToDelete.id);
      await supabase.from('labels').delete().eq('inbox_id', inboxToDelete.id);
      const { error } = await supabase.from('inboxes').delete().eq('id', inboxToDelete.id);
      if (error) throw error;
      toast.success('Caixa excluída'); setInboxToDelete(null); fetchInboxes();
    } catch (e: any) { toast.error(e.message || 'Erro ao excluir'); }
    finally { setIsDeletingInbox(false); }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) { toast.error('Email e senha são obrigatórios'); return; }
    setIsCreatingUser(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, full_name: newUserName, role: newUserRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');
      toast.success('Usuário criado!');
      setIsCreateUserOpen(false); setNewUserEmail(''); setNewUserPassword(''); setNewUserName(''); setNewUserRole('user');
      fetchUsers();
    } catch (e: any) { toast.error(e.message || 'Erro ao criar usuário'); }
    finally { setIsCreatingUser(false); }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      toast.success('Papel atualizado!'); fetchUsers();
    } catch { toast.error('Erro ao alterar papel'); }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userToDelete.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao excluir');
      toast.success('Usuário excluído!'); setUserToDelete(null); fetchUsers();
    } catch (e: any) { toast.error(e.message || 'Erro ao excluir'); }
    finally { setIsDeletingUser(false); }
  };

  const handleSaveUserProfile = async () => {
    if (!editingUser || !editUserName.trim()) return;
    setIsSavingUser(true);
    try {
      const { error } = await supabase.from('user_profiles').update({ full_name: editUserName.trim() }).eq('id', editingUser.id);
      if (error) throw error;
      toast.success('Usuário atualizado!'); setEditingUser(null); fetchUsers();
    } catch (e: any) { toast.error(e.message || 'Erro ao atualizar'); }
    finally { setIsSavingUser(false); }
  };

  const handleRemoveMembership = async () => {
    if (!removeMembership) return;
    setIsRemovingMembership(true);
    try {
      const { error } = await supabase.from('inbox_users').delete().eq('user_id', removeMembership.userId).eq('inbox_id', removeMembership.inboxId);
      if (error) throw error;
      toast.success('Membro removido da caixa'); setRemoveMembership(null); fetchTeam();
    } catch { toast.error('Erro ao remover membro'); }
    finally { setIsRemovingMembership(false); }
  };

  const handleChangeTeamRole = async (userId: string, inboxId: string, newRole: InboxRole) => {
    try {
      const { error } = await supabase.from('inbox_users').update({ role: newRole }).eq('user_id', userId).eq('inbox_id', inboxId);
      if (error) throw error;
      toast.success('Papel atualizado!'); fetchTeam();
    } catch { toast.error('Erro ao alterar papel'); }
  };

  // ── Filtered data ──
  const filteredInboxes = inboxes.filter(i => i.name.toLowerCase().includes(inboxSearch.toLowerCase()) || i.instance_name.toLowerCase().includes(inboxSearch.toLowerCase()));
  const filteredUsers = users.filter(u => {
    const s = usersSearch.toLowerCase();
    return (u.email.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s)) && (userRoleFilter === 'all' || u.app_role === userRoleFilter);
  });
  const filteredTeam = teamUsers.filter(u => u.email.toLowerCase().includes(teamSearch.toLowerCase()) || u.full_name?.toLowerCase().includes(teamSearch.toLowerCase()));

  return {
    isSuperAdmin,
    // Tab / search / filter
    activeTab, setActiveTab,
    inboxSearch, setInboxSearch,
    usersSearch, setUsersSearch,
    teamSearch, setTeamSearch,
    userRoleFilter, setUserRoleFilter,
    // Data
    inboxes, inboxesLoading, instances,
    users, usersLoading,
    teamUsers, teamLoading,
    // Filtered
    filteredInboxes, filteredUsers, filteredTeam,
    // Create inbox
    isCreateInboxOpen, setIsCreateInboxOpen,
    isCreatingInbox, newInboxName, setNewInboxName,
    selectedInstanceId, setSelectedInstanceId,
    webhookUrl, setWebhookUrl,
    webhookOutgoingUrl, setWebhookOutgoingUrl,
    handleCreateInbox,
    // Create user
    isCreateUserOpen, setIsCreateUserOpen,
    isCreatingUser, newUserEmail, setNewUserEmail,
    newUserPassword, setNewUserPassword,
    newUserName, setNewUserName,
    newUserRole, setNewUserRole,
    handleCreateUser,
    // Edit user
    editingUser, setEditingUser,
    editUserName, setEditUserName,
    isSavingUser, handleSaveUserProfile,
    // Roles
    handleChangeRole, handleChangeTeamRole,
    // Deletes
    inboxToDelete, setInboxToDelete, isDeletingInbox, handleDeleteInbox,
    userToDelete, setUserToDelete, isDeletingUser, handleDeleteUser,
    removeMembership, setRemoveMembership, isRemovingMembership, handleRemoveMembership,
    // Dialogs
    manageInbox, setManageInbox,
    manageInstancesUser, setManageInstancesUser,
    isManageInstancesOpen, setIsManageInstancesOpen,
    isCreateTeamUserOpen, setIsCreateTeamUserOpen,
    // Refresh
    fetchInboxes, fetchTeam, fetchUsers,
  };
};
