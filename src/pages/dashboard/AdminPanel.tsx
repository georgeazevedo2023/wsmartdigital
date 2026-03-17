import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ShieldCheck, Plus, Search, Inbox, Users, Headphones, Loader2, Shield,
  ChevronDown, UserPlus, AlertTriangle, Briefcase, MonitorSmartphone, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import ManageInboxUsersDialog from '@/components/dashboard/ManageInboxUsersDialog';
import ManageUserInstancesDialog from '@/components/dashboard/ManageUserInstancesDialog';
import CreateInboxUserDialog from '@/components/dashboard/CreateInboxUserDialog';
import BackupModule from '@/components/dashboard/BackupModule';
import MigrationWizard from '@/components/dashboard/MigrationWizard';
import { useIsMobile } from '@/hooks/use-mobile';

import AdminStatsBar from '@/components/admin/AdminStatsBar';
import InboxCard from '@/components/admin/InboxCard';
import UserCard from '@/components/admin/UserCard';
import TeamSection from '@/components/admin/TeamSection';
import EmptyState from '@/components/ui/empty-state';
import { APP_ROLE_CONFIG } from '@/components/admin/constants';
import type { AppRole, InboxRole, InboxWithDetails, UserWithRole, InboxUser } from '@/components/admin/types';

const AdminPanel = () => {
  const { isSuperAdmin, user } = useAuth();
  const isMobile = useIsMobile();

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

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

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

  // ── Render ──
  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Administração</h1>
            <p className="text-sm text-muted-foreground">Gerencie caixas, usuários e equipe</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Criar Novo<ChevronDown className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setIsCreateInboxOpen(true)}><Inbox className="w-4 h-4 mr-2" />Nova Caixa de Entrada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreateUserOpen(true)}><Shield className="w-4 h-4 mr-2" />Novo Usuário</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreateTeamUserOpen(true)}><UserPlus className="w-4 h-4 mr-2" />Novo Membro de Atendimento</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AdminStatsBar inboxes={inboxes} users={users} teamUsers={teamUsers} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto no-scrollbar h-11">
          {[
            { value: 'inboxes', icon: Inbox, label: 'Caixas', count: inboxes.length },
            { value: 'users', icon: Shield, label: 'Usuários', count: users.length },
            { value: 'team', icon: Headphones, label: 'Equipe', count: teamUsers.length },
            { value: 'tools', icon: Wrench, label: 'Ferramentas' },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2 min-h-[36px]">
              <t.icon className="w-4 h-4" />
              {!isMobile && <span>{t.label}</span>}
              {'count' in t && t.count !== undefined && <Badge variant="outline" className="text-[10px] h-5 px-1.5">{t.count}</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TAB: Inboxes */}
        <TabsContent value="inboxes" className="mt-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar caixas..." className="pl-9" value={inboxSearch} onChange={e => setInboxSearch(e.target.value)} />
          </div>
          {inboxesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
          ) : filteredInboxes.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhuma caixa encontrada" description="Crie a primeira caixa de entrada" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredInboxes.map(inbox => (
                <InboxCard key={inbox.id} inbox={inbox} onManageMembers={() => setManageInbox(inbox)} onDelete={() => setInboxToDelete(inbox)} onRefresh={fetchInboxes} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Users */}
        <TabsContent value="users" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar usuários..." className="pl-9" value={usersSearch} onChange={e => setUsersSearch(e.target.value)} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {([
                { value: 'all' as const, label: 'Todos', count: users.length },
                { value: 'super_admin' as const, label: 'Admin', count: users.filter(u => u.app_role === 'super_admin').length },
                { value: 'gerente' as const, label: 'Gerente', count: users.filter(u => u.app_role === 'gerente').length },
                { value: 'user' as const, label: 'Atendente', count: users.filter(u => u.app_role === 'user').length },
              ]).map(f => (
                <button key={f.value} onClick={() => setUserRoleFilter(f.value)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap min-h-[32px] ${userRoleFilter === f.value ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50'}`}>
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${userRoleFilter === f.value ? 'bg-primary/20' : 'bg-muted/50'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          {usersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Crie o primeiro usuário" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredUsers.map(u => (
                <UserCard key={u.id} user={u} onChangeRole={handleChangeRole} onManageInstances={() => { setManageInstancesUser(u); setIsManageInstancesOpen(true); }} onDelete={() => setUserToDelete(u)} onEdit={() => { setEditingUser(u); setEditUserName(u.full_name || ''); }} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Team */}
        <TabsContent value="team" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar membros..." className="pl-9" value={teamSearch} onChange={e => setTeamSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsCreateTeamUserOpen(true)}>
              <UserPlus className="w-4 h-4" />Adicionar Membro
            </Button>
          </div>
          {teamLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : filteredTeam.length === 0 ? (
            <EmptyState icon={Headphones} title="Nenhum membro na equipe" desc="Adicione membros às caixas de atendimento" />
          ) : (
            <TeamSection teamUsers={filteredTeam} onRemoveMembership={(userId, inboxId, userName, inboxName) => setRemoveMembership({ userId, inboxId, userName, inboxName })} onChangeTeamRole={handleChangeTeamRole} />
          )}
        </TabsContent>

        {/* TAB: Tools */}
        <TabsContent value="tools" className="mt-5 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" />Backup</h2>
            <BackupModule />
          </div>
          <div className="border-t border-border/30 pt-6 space-y-2">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2"><MonitorSmartphone className="w-5 h-5 text-primary" />Migração</h2>
            <MigrationWizard />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}

      {/* Create Inbox */}
      <Dialog open={isCreateInboxOpen} onOpenChange={setIsCreateInboxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Caixa de Entrada</DialogTitle>
            <DialogDescription>Vincule uma caixa a uma instância WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Ex: Suporte, Vendas..." value={newInboxName} onChange={e => setNewInboxName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Instância WhatsApp *</Label>
              <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {instances.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${inst.status === 'connected' ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
                        {inst.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Webhook URL (n8n)</Label><Input placeholder="https://seu-n8n.com/webhook/..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} /></div>
            <div className="space-y-2"><Label>Webhook Outgoing URL</Label><Input placeholder="https://seu-n8n.com/webhook/outgoing..." value={webhookOutgoingUrl} onChange={e => setWebhookOutgoingUrl(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateInboxOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateInbox} disabled={isCreatingInbox}>
              {isCreatingInbox ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>Crie uma conta de usuário no sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome Completo</Label><Input placeholder="Nome do usuário" value={newUserName} onChange={e => setNewUserName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="email@exemplo.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Senha *</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Perfil de Acesso *</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'super_admin' as AppRole, label: 'Super Admin', desc: 'Acesso total ao sistema', Icon: Shield },
                  { value: 'gerente' as AppRole, label: 'Gerente', desc: 'Atendimento e CRM', Icon: Briefcase },
                  { value: 'user' as AppRole, label: 'Atendente', desc: 'Apenas suas caixas', Icon: Headphones },
                ]).map(opt => (
                  <button key={opt.value} type="button" onClick={() => setNewUserRole(opt.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${newUserRole === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'}`}>
                    <opt.Icon className={`w-5 h-5 ${newUserRole === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                    <span className="text-[10px] opacity-70 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User */}
      <Dialog open={!!editingUser} onOpenChange={open => { if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle><DialogDescription>Atualize o nome completo do usuário</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Email</Label><Input value={editingUser?.email || ''} disabled className="opacity-60" /></div>
            <div className="space-y-2"><Label>Nome Completo</Label><Input placeholder="Nome do usuário" value={editUserName} onChange={e => setEditUserName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleSaveUserProfile(); }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveUserProfile} disabled={isSavingUser || !editUserName.trim()}>
              {isSavingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!inboxToDelete} onOpenChange={open => !open && setInboxToDelete(null)}
        title="Excluir caixa de entrada?"
        description={<><strong>{inboxToDelete?.name}</strong> e todos seus membros e etiquetas serão removidos. Esta ação não pode ser desfeita.</>}
        onConfirm={handleDeleteInbox} isLoading={isDeletingInbox} confirmLabel="Excluir"
      />
      <ConfirmDialog
        open={!!userToDelete} onOpenChange={open => !open && setUserToDelete(null)}
        title={<span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Excluir usuário?</span>}
        description={<><strong>{userToDelete?.full_name || userToDelete?.email}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.</>}
        onConfirm={handleDeleteUser} isLoading={isDeletingUser} confirmLabel="Excluir"
      />
      <ConfirmDialog
        open={!!removeMembership} onOpenChange={open => !open && setRemoveMembership(null)}
        title="Remover membro da caixa?"
        description={removeMembership ? <><strong>{removeMembership.userName}</strong> será removido de <strong>{removeMembership.inboxName}</strong>. A conta não será excluída.</> : ''}
        onConfirm={handleRemoveMembership} isLoading={isRemovingMembership} confirmLabel="Remover"
      />

      {/* External Dialogs */}
      {manageInbox && <ManageInboxUsersDialog open={!!manageInbox} onOpenChange={open => !open && setManageInbox(null)} inboxId={manageInbox.id} inboxName={manageInbox.name} onUpdate={() => { fetchInboxes(); fetchTeam(); }} />}
      <ManageUserInstancesDialog open={isManageInstancesOpen} onOpenChange={setIsManageInstancesOpen} user={manageInstancesUser} onSave={fetchUsers} />
      <CreateInboxUserDialog open={isCreateTeamUserOpen} onOpenChange={setIsCreateTeamUserOpen} onCreated={() => { fetchTeam(); fetchUsers(); }} />
    </div>
  );
};

export default AdminPanel;
