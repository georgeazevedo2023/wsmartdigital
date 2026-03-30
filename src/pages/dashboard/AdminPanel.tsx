import React from 'react';
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
  ChevronDown, UserPlus, AlertTriangle, Briefcase, MonitorSmartphone, Wrench, FileText,
} from 'lucide-react';
import ManageInboxUsersDialog from '@/components/dashboard/ManageInboxUsersDialog';
import ManageUserInstancesDialog from '@/components/dashboard/ManageUserInstancesDialog';
import CreateInboxUserDialog from '@/components/dashboard/CreateInboxUserDialog';
import BackupModule from '@/components/dashboard/BackupModule';
import MigrationWizard from '@/components/dashboard/MigrationWizard';
import BroadcasterDocsTab from '@/components/admin/BroadcasterDocsTab';
import { useIsMobile } from '@/hooks/use-mobile';

import AdminStatsBar from '@/components/admin/AdminStatsBar';
import InboxCard from '@/components/admin/InboxCard';
import UserCard from '@/components/admin/UserCard';
import TeamSection from '@/components/admin/TeamSection';
import EmptyState from '@/components/ui/empty-state';
import type { AppRole } from '@/components/admin/types';

import { useAdminPanel } from '@/hooks/useAdminPanel';

const AdminPanel = () => {
  const h = useAdminPanel();
  const isMobile = useIsMobile();

  if (!h.isSuperAdmin) return <Navigate to="/dashboard" replace />;

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
            <DropdownMenuItem onClick={() => h.setIsCreateInboxOpen(true)}><Inbox className="w-4 h-4 mr-2" />Nova Caixa de Entrada</DropdownMenuItem>
            <DropdownMenuItem onClick={() => h.setIsCreateUserOpen(true)}><Shield className="w-4 h-4 mr-2" />Novo Usuário</DropdownMenuItem>
            <DropdownMenuItem onClick={() => h.setIsCreateTeamUserOpen(true)}><UserPlus className="w-4 h-4 mr-2" />Novo Membro de Atendimento</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AdminStatsBar inboxes={h.inboxes} users={h.users} teamUsers={h.teamUsers} />

      <Tabs value={h.activeTab} onValueChange={h.setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto no-scrollbar h-11">
          {[
            { value: 'inboxes', icon: Inbox, label: 'Caixas', count: h.inboxes.length },
            { value: 'users', icon: Shield, label: 'Usuários', count: h.users.length },
            { value: 'team', icon: Headphones, label: 'Equipe', count: h.teamUsers.length },
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
            <Input placeholder="Buscar caixas..." className="pl-9" value={h.inboxSearch} onChange={e => h.setInboxSearch(e.target.value)} />
          </div>
          {h.inboxesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>
          ) : h.filteredInboxes.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhuma caixa encontrada" description="Crie a primeira caixa de entrada" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {h.filteredInboxes.map(inbox => (
                <InboxCard key={inbox.id} inbox={inbox} onManageMembers={() => h.setManageInbox(inbox)} onDelete={() => h.setInboxToDelete(inbox)} onRefresh={h.fetchInboxes} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Users */}
        <TabsContent value="users" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar usuários..." className="pl-9" value={h.usersSearch} onChange={e => h.setUsersSearch(e.target.value)} />
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {([
                { value: 'all' as const, label: 'Todos', count: h.users.length },
                { value: 'super_admin' as const, label: 'Admin', count: h.users.filter(u => u.app_role === 'super_admin').length },
                { value: 'gerente' as const, label: 'Gerente', count: h.users.filter(u => u.app_role === 'gerente').length },
                { value: 'user' as const, label: 'Atendente', count: h.users.filter(u => u.app_role === 'user').length },
              ]).map(f => (
                <button key={f.value} onClick={() => h.setUserRoleFilter(f.value)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap min-h-[32px] ${h.userRoleFilter === f.value ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50'}`}>
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${h.userRoleFilter === f.value ? 'bg-primary/20' : 'bg-muted/50'}`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          {h.usersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
          ) : h.filteredUsers.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Crie o primeiro usuário" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {h.filteredUsers.map(u => (
                <UserCard key={u.id} user={u} onChangeRole={h.handleChangeRole} onManageInstances={() => { h.setManageInstancesUser(u); h.setIsManageInstancesOpen(true); }} onDelete={() => h.setUserToDelete(u)} onEdit={() => { h.setEditingUser(u); h.setEditUserName(u.full_name || ''); }} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Team */}
        <TabsContent value="team" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar membros..." className="pl-9" value={h.teamSearch} onChange={e => h.setTeamSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => h.setIsCreateTeamUserOpen(true)}>
              <UserPlus className="w-4 h-4" />Adicionar Membro
            </Button>
          </div>
          {h.teamLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : h.filteredTeam.length === 0 ? (
            <EmptyState icon={Headphones} title="Nenhum membro na equipe" description="Adicione membros às caixas de atendimento" />
          ) : (
            <TeamSection teamUsers={h.filteredTeam} onRemoveMembership={(userId, inboxId, userName, inboxName) => h.setRemoveMembership({ userId, inboxId, userName, inboxName })} onChangeTeamRole={h.handleChangeTeamRole} />
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
      <Dialog open={h.isCreateInboxOpen} onOpenChange={h.setIsCreateInboxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Caixa de Entrada</DialogTitle>
            <DialogDescription>Vincule uma caixa a uma instância WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input placeholder="Ex: Suporte, Vendas..." value={h.newInboxName} onChange={e => h.setNewInboxName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Instância WhatsApp *</Label>
              <Select value={h.selectedInstanceId} onValueChange={h.setSelectedInstanceId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {h.instances.map(inst => (
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
            <div className="space-y-2"><Label>Webhook URL (n8n)</Label><Input placeholder="https://seu-n8n.com/webhook/..." value={h.webhookUrl} onChange={e => h.setWebhookUrl(e.target.value)} /></div>
            <div className="space-y-2"><Label>Webhook Outgoing URL</Label><Input placeholder="https://seu-n8n.com/webhook/outgoing..." value={h.webhookOutgoingUrl} onChange={e => h.setWebhookOutgoingUrl(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setIsCreateInboxOpen(false)}>Cancelar</Button>
            <Button onClick={h.handleCreateInbox} disabled={h.isCreatingInbox}>
              {h.isCreatingInbox ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User */}
      <Dialog open={h.isCreateUserOpen} onOpenChange={h.setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>Crie uma conta de usuário no sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome Completo</Label><Input placeholder="Nome do usuário" value={h.newUserName} onChange={e => h.setNewUserName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="email@exemplo.com" value={h.newUserEmail} onChange={e => h.setNewUserEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Senha *</Label><Input type="password" placeholder="Mínimo 6 caracteres" value={h.newUserPassword} onChange={e => h.setNewUserPassword(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Perfil de Acesso *</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'super_admin' as AppRole, label: 'Super Admin', desc: 'Acesso total ao sistema', Icon: Shield },
                  { value: 'gerente' as AppRole, label: 'Gerente', desc: 'Atendimento e CRM', Icon: Briefcase },
                  { value: 'user' as AppRole, label: 'Atendente', desc: 'Apenas suas caixas', Icon: Headphones },
                ]).map(opt => (
                  <button key={opt.value} type="button" onClick={() => h.setNewUserRole(opt.value)} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${h.newUserRole === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'}`}>
                    <opt.Icon className={`w-5 h-5 ${h.newUserRole === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold leading-tight">{opt.label}</span>
                    <span className="text-[10px] opacity-70 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setIsCreateUserOpen(false)}>Cancelar</Button>
            <Button onClick={h.handleCreateUser} disabled={h.isCreatingUser}>
              {h.isCreatingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User */}
      <Dialog open={!!h.editingUser} onOpenChange={open => { if (!open) h.setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle><DialogDescription>Atualize o nome completo do usuário</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Email</Label><Input value={h.editingUser?.email || ''} disabled className="opacity-60" /></div>
            <div className="space-y-2"><Label>Nome Completo</Label><Input placeholder="Nome do usuário" value={h.editUserName} onChange={e => h.setEditUserName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') h.handleSaveUserProfile(); }} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => h.setEditingUser(null)}>Cancelar</Button>
            <Button onClick={h.handleSaveUserProfile} disabled={h.isSavingUser || !h.editUserName.trim()}>
              {h.isSavingUser ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!h.inboxToDelete} onOpenChange={open => !open && h.setInboxToDelete(null)}
        title="Excluir caixa de entrada?"
        description={<><strong>{h.inboxToDelete?.name}</strong> e todos seus membros e etiquetas serão removidos. Esta ação não pode ser desfeita.</>}
        onConfirm={h.handleDeleteInbox} isLoading={h.isDeletingInbox} confirmLabel="Excluir"
      />
      <ConfirmDialog
        open={!!h.userToDelete} onOpenChange={open => !open && h.setUserToDelete(null)}
        title={<span className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Excluir usuário?</span>}
        description={<><strong>{h.userToDelete?.full_name || h.userToDelete?.email}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.</>}
        onConfirm={h.handleDeleteUser} isLoading={h.isDeletingUser} confirmLabel="Excluir"
      />
      <ConfirmDialog
        open={!!h.removeMembership} onOpenChange={open => !open && h.setRemoveMembership(null)}
        title="Remover membro da caixa?"
        description={h.removeMembership ? <><strong>{h.removeMembership.userName}</strong> será removido de <strong>{h.removeMembership.inboxName}</strong>. A conta não será excluída.</> : ''}
        onConfirm={h.handleRemoveMembership} isLoading={h.isRemovingMembership} confirmLabel="Remover"
      />

      {/* External Dialogs */}
      {h.manageInbox && <ManageInboxUsersDialog open={!!h.manageInbox} onOpenChange={open => !open && h.setManageInbox(null)} inboxId={h.manageInbox.id} inboxName={h.manageInbox.name} onUpdate={() => { h.fetchInboxes(); h.fetchTeam(); }} />}
      <ManageUserInstancesDialog open={h.isManageInstancesOpen} onOpenChange={h.setIsManageInstancesOpen} user={h.manageInstancesUser} onSave={h.fetchUsers} />
      <CreateInboxUserDialog open={h.isCreateTeamUserOpen} onOpenChange={h.setIsCreateTeamUserOpen} onCreated={() => { h.fetchTeam(); h.fetchUsers(); }} />
    </div>
  );
};

export default AdminPanel;
