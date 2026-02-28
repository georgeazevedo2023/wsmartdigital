import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ShieldCheck,
  Plus,
  Search,
  Inbox,
  Users,
  Headphones,
  Loader2,
  Trash2,
  Settings,
  MonitorSmartphone,
  Shield,
  ChevronDown,
  Link,
  Copy,
  Pencil,
  Check,
  X,
  UserPlus,
  AlertTriangle,
  Briefcase,
  MoreVertical,
  Wrench,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import ManageInboxUsersDialog from '@/components/dashboard/ManageInboxUsersDialog';
import ManageUserInstancesDialog from '@/components/dashboard/ManageUserInstancesDialog';
import CreateInboxUserDialog from '@/components/dashboard/CreateInboxUserDialog';
import BackupModule from '@/components/dashboard/BackupModule';
import MigrationWizard from '@/components/dashboard/MigrationWizard';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Database } from '@/integrations/supabase/types';

type InboxRole = Database['public']['Enums']['inbox_role'];

// ─── Types ───────────────────────────────────────────────────────────────────

interface InboxWithDetails {
  id: string;
  name: string;
  instance_id: string;
  instance_name: string;
  instance_status: string;
  created_by: string;
  created_at: string;
  member_count: number;
  webhook_url: string | null;
  webhook_outgoing_url: string | null;
}

type AppRole = 'super_admin' | 'gerente' | 'user';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_super_admin: boolean;
  app_role: AppRole;
  instance_count: number;
  instances: { id: string; name: string; phone: string | null }[];
}

interface InboxMembership {
  inbox_id: string;
  inbox_name: string;
  instance_name: string;
  role: InboxRole;
}

interface InboxUser {
  id: string;
  email: string;
  full_name: string | null;
  memberships: InboxMembership[];
}

const ROLE_LABELS: Record<InboxRole, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  agente: 'Agente',
};

const ROLE_COLORS: Record<InboxRole, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  gestor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  agente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const APP_ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; colorClass: string }> = {
  super_admin: { label: 'Admin', icon: Shield, colorClass: 'bg-primary/10 text-primary border-primary/20' },
  gerente: { label: 'Gerente', icon: Briefcase, colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  user: { label: 'Atendente', icon: Headphones, colorClass: 'bg-muted text-muted-foreground border-border' },
};

const formatPhone = (jid: string | null): string => {
  if (!jid) return '';
  const clean = jid.replace(/@s\.whatsapp\.net$/, '');
  if (clean.length === 13)
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
  if (clean.length === 12)
    return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)}-${clean.slice(8)}`;
  return clean;
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const AdminStatsBar = ({ inboxes, users, teamUsers }: { inboxes: InboxWithDetails[]; users: UserWithRole[]; teamUsers: InboxUser[] }) => {
  const connectedInboxes = inboxes.filter(i => i.instance_status === 'connected').length;
  const stats = [
    { label: 'Caixas', value: inboxes.length, sub: `${connectedInboxes} online`, icon: Inbox },
    { label: 'Usuários', value: users.length, sub: `${users.filter(u => u.app_role === 'super_admin').length} admins`, icon: Users },
    { label: 'Atendentes', value: teamUsers.length, sub: `${new Set(teamUsers.flatMap(u => u.memberships.map(m => m.inbox_id))).size} caixas`, icon: Headphones },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
      {stats.map(s => (
        <div key={s.label} className="glass-card flex-1 min-w-[140px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <s.icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-display font-bold leading-none">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const InboxCard = ({
  inbox,
  onManageMembers,
  onDelete,
  editingWebhookId,
  editWebhookValue,
  setEditWebhookValue,
  setEditingWebhookId,
  handleSaveWebhook,
  isSavingWebhook,
  editingOutgoingId,
  editOutgoingValue,
  setEditOutgoingValue,
  setEditingOutgoingId,
  handleSaveOutgoing,
  isSavingOutgoing,
}: {
  inbox: InboxWithDetails;
  onManageMembers: () => void;
  onDelete: () => void;
  editingWebhookId: string | null;
  editWebhookValue: string;
  setEditWebhookValue: (v: string) => void;
  setEditingWebhookId: (v: string | null) => void;
  handleSaveWebhook: (id: string) => void;
  isSavingWebhook: boolean;
  editingOutgoingId: string | null;
  editOutgoingValue: string;
  setEditOutgoingValue: (v: string) => void;
  setEditingOutgoingId: (v: string | null) => void;
  handleSaveOutgoing: (id: string) => void;
  isSavingOutgoing: boolean;
}) => {
  const isConnected = inbox.instance_status === 'connected';

  return (
    <div className="glass-card-hover p-4 sm:p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50 border border-border/50'}`}>
            <Inbox className={`w-5 h-5 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{inbox.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground truncate">{inbox.instance_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="gap-1 h-7">
            <Users className="w-3 h-3" />
            {inbox.member_count}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onManageMembers}>
                <Users className="w-4 h-4 mr-2" /> Gerenciar Membros
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(inbox.id); toast.success('Inbox ID copiado!'); }}>
                <Copy className="w-4 h-4 mr-2" /> Copiar ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Webhooks compact */}
      <div className="space-y-2">
        <WebhookRow
          label="Webhook Entrada"
          value={inbox.webhook_url}
          isEditing={editingWebhookId === inbox.id}
          editValue={editWebhookValue}
          setEditValue={setEditWebhookValue}
          onEdit={() => { setEditingWebhookId(inbox.id); setEditWebhookValue(inbox.webhook_url || ''); }}
          onSave={() => handleSaveWebhook(inbox.id)}
          onCancel={() => setEditingWebhookId(null)}
          isSaving={isSavingWebhook}
        />
        <WebhookRow
          label="Webhook Saída"
          value={inbox.webhook_outgoing_url}
          isEditing={editingOutgoingId === inbox.id}
          editValue={editOutgoingValue}
          setEditValue={setEditOutgoingValue}
          onEdit={() => { setEditingOutgoingId(inbox.id); setEditOutgoingValue(inbox.webhook_outgoing_url || ''); }}
          onSave={() => handleSaveOutgoing(inbox.id)}
          onCancel={() => setEditingOutgoingId(null)}
          isSaving={isSavingOutgoing}
        />
      </div>
    </div>
  );
};

const WebhookRow = ({
  label,
  value,
  isEditing,
  editValue,
  setEditValue,
  onEdit,
  onSave,
  onCancel,
  isSaving,
}: {
  label: string;
  value: string | null;
  isEditing: boolean;
  editValue: string;
  setEditValue: (v: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Input className="h-8 text-xs flex-1" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus placeholder="https://..." />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" disabled={isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/20 min-h-[32px]">
      <Link className="w-3 h-3 text-muted-foreground shrink-0" />
      <span className="text-[11px] text-muted-foreground font-medium shrink-0">{label}:</span>
      {value ? (
        <>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground truncate flex-1 cursor-default">{value}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[400px] break-all">
                <p className="text-xs">{value}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { navigator.clipboard.writeText(value); toast.success('Copiado!'); }}>
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onEdit}>
            <Pencil className="w-3 h-3" />
          </Button>
        </>
      ) : (
        <button onClick={onEdit} className="text-xs text-primary/70 hover:text-primary transition-colors ml-auto">
          + Adicionar
        </button>
      )}
    </div>
  );
};

const UserCard = ({
  user: u,
  onChangeRole,
  onManageInstances,
  onDelete,
}: {
  user: UserWithRole;
  onChangeRole: (userId: string, role: AppRole) => void;
  onManageInstances: () => void;
  onDelete: () => void;
}) => {
  const roleConfig = APP_ROLE_CONFIG[u.app_role];
  const RoleIcon = roleConfig.icon;

  return (
    <div className="glass-card-hover p-4 sm:p-5 flex flex-col gap-4">
      {/* User info */}
      <div className="flex items-start gap-3">
        <Avatar className="w-11 h-11 shrink-0">
          <AvatarImage src={u.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{u.full_name || 'Sem nome'}</p>
          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge variant="outline" className={`gap-1 text-[11px] h-6 ${roleConfig.colorClass}`}>
              <RoleIcon className="w-3 h-3" />
              {roleConfig.label}
            </Badge>
            {u.instance_count > 0 && (
              <Badge variant="outline" className="gap-1 text-[11px] h-6">
                <MonitorSmartphone className="w-3 h-3" />
                {u.instance_count}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Role selector - segmented control */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/30">
        {(['super_admin', 'gerente', 'user'] as AppRole[]).map(role => {
          const config = APP_ROLE_CONFIG[role];
          const Icon = config.icon;
          const isActive = u.app_role === role;
          return (
            <button
              key={role}
              onClick={() => !isActive && onChangeRole(u.id, role)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-border/20">
        <Button variant="ghost" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={onManageInstances}>
          <Settings className="w-3.5 h-3.5" />
          Instâncias
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const TeamSection = ({
  teamUsers,
  inboxes,
  onRemoveMembership,
}: {
  teamUsers: InboxUser[];
  inboxes: InboxWithDetails[];
  onRemoveMembership: (userId: string, inboxId: string, userName: string, inboxName: string) => void;
}) => {
  // Group by inbox
  const groupedByInbox = useMemo(() => {
    const map = new Map<string, { inboxName: string; instanceName: string; members: { userId: string; userName: string; email: string; role: InboxRole }[] }>();
    teamUsers.forEach(u => {
      u.memberships.forEach(m => {
        if (!map.has(m.inbox_id)) {
          map.set(m.inbox_id, { inboxName: m.inbox_name, instanceName: m.instance_name, members: [] });
        }
        map.get(m.inbox_id)!.members.push({
          userId: u.id,
          userName: u.full_name || u.email,
          email: u.email,
          role: m.role,
        });
      });
    });
    return Array.from(map.entries());
  }, [teamUsers]);

  if (groupedByInbox.length === 0) return null;

  return (
    <div className="space-y-4">
      {groupedByInbox.map(([inboxId, group]) => (
        <div key={inboxId} className="glass-card p-4 sm:p-5 space-y-3">
          {/* Inbox header */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{group.inboxName}</p>
              {group.instanceName && (
                <p className="text-xs text-muted-foreground">{group.instanceName}</p>
              )}
            </div>
            <Badge variant="outline" className="ml-auto shrink-0 gap-1">
              <Users className="w-3 h-3" />
              {group.members.length}
            </Badge>
          </div>

          {/* Members */}
          <div className="space-y-1.5">
            {group.members.map(member => (
              <div key={`${member.userId}-${inboxId}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/20 border border-border/20">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                      {member.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{member.userName}</p>
                    <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[11px] h-6 ${ROLE_COLORS[member.role]}`}>
                    {ROLE_LABELS[member.role]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveMembership(member.userId, inboxId, member.userName, group.inboxName)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { isSuperAdmin, user } = useAuth();
  const isMobile = useIsMobile();

  // Tabs
  const [activeTab, setActiveTab] = useState('inboxes');

  // Global search per tab
  const [inboxSearch, setInboxSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | AppRole>('all');

  // Inboxes state
  const [inboxes, setInboxes] = useState<InboxWithDetails[]>([]);
  const [inboxesLoading, setInboxesLoading] = useState(true);
  const [instances, setInstances] = useState<{ id: string; name: string; status: string }[]>([]);

  // Create inbox dialog
  const [isCreateInboxOpen, setIsCreateInboxOpen] = useState(false);
  const [isCreatingInbox, setIsCreatingInbox] = useState(false);
  const [newInboxName, setNewInboxName] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookOutgoingUrl, setWebhookOutgoingUrl] = useState('');

  // Delete inbox
  const [inboxToDelete, setInboxToDelete] = useState<InboxWithDetails | null>(null);
  const [isDeletingInbox, setIsDeletingInbox] = useState(false);

  // Manage inbox members
  const [manageInbox, setManageInbox] = useState<InboxWithDetails | null>(null);

  // Webhook editing
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null);
  const [editWebhookValue, setEditWebhookValue] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [editingOutgoingId, setEditingOutgoingId] = useState<string | null>(null);
  const [editOutgoingValue, setEditOutgoingValue] = useState('');
  const [isSavingOutgoing, setIsSavingOutgoing] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Create user dialog
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AppRole>('user');

  // Delete user
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Manage user instances
  const [manageInstancesUser, setManageInstancesUser] = useState<UserWithRole | null>(null);
  const [isManageInstancesOpen, setIsManageInstancesOpen] = useState(false);

  // Team state
  const [teamUsers, setTeamUsers] = useState<InboxUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [isCreateTeamUserOpen, setIsCreateTeamUserOpen] = useState(false);
  const [removeMembership, setRemoveMembership] = useState<{
    userId: string;
    inboxId: string;
    userName: string;
    inboxName: string;
  } | null>(null);
  const [isRemovingMembership, setIsRemovingMembership] = useState(false);

  // ── Fetch inboxes ──────────────────────────────────────────────────────────
  const fetchInboxes = useCallback(async () => {
    setInboxesLoading(true);
    try {
      const { data: inboxData, error } = await supabase
        .from('inboxes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!inboxData?.length) { setInboxes([]); return; }

      const instanceIds = [...new Set(inboxData.map(i => i.instance_id))];
      const { data: instanceData } = await supabase
        .from('instances')
        .select('id, name, status')
        .in('id', instanceIds);
      const instanceMap = new Map((instanceData || []).map(i => [i.id, i]));

      const { data: memberData } = await supabase.from('inbox_users').select('inbox_id');
      const memberCounts = new Map<string, number>();
      (memberData || []).forEach(m => memberCounts.set(m.inbox_id, (memberCounts.get(m.inbox_id) || 0) + 1));

      setInboxes(inboxData.map(inbox => ({
        id: inbox.id,
        name: inbox.name,
        instance_id: inbox.instance_id,
        instance_name: instanceMap.get(inbox.instance_id)?.name || 'Instância removida',
        instance_status: instanceMap.get(inbox.instance_id)?.status || 'disconnected',
        created_by: inbox.created_by,
        created_at: inbox.created_at,
        member_count: memberCounts.get(inbox.id) || 0,
        webhook_url: (inbox as any).webhook_url || null,
        webhook_outgoing_url: (inbox as any).webhook_outgoing_url || null,
      })));
    } catch (e) {
      toast.error('Erro ao carregar caixas');
    } finally {
      setInboxesLoading(false);
    }
  }, []);

  // ── Fetch instances ────────────────────────────────────────────────────────
  const fetchInstances = useCallback(async () => {
    const { data } = await supabase.from('instances').select('id, name, status').order('name');
    if (data) setInstances(data);
  }, []);

  // ── Fetch users ────────────────────────────────────────────────────────────
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
        const userRoles = roles.filter(r => r.user_id === userId).map(r => r.role);
        if (userRoles.includes('super_admin')) return 'super_admin';
        if (userRoles.includes('gerente')) return 'gerente';
        return 'user';
      };

      setUsers(profiles.map(p => {
        const userAccess = access.filter(a => a.user_id === p.id);
        const instances = userAccess
          .map(a => { const i = instMap.get(a.instance_id); return i ? { id: i.id, name: i.name, phone: i.owner_jid } : null; })
          .filter(Boolean) as UserWithRole['instances'];
        const role = resolveRole(p.id);
        return {
          ...p,
          is_super_admin: role === 'super_admin',
          app_role: role,
          instance_count: instances.length,
          instances,
        };
      }));
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ── Fetch team ─────────────────────────────────────────────────────────────
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
      const inboxesList = inboxesRes.data || [];
      const inboxMap = new Map(inboxesList.map(ib => [ib.id, ib]));
      const instanceMap = new Map((instancesRes.data || []).map(i => [i.id, i]));
      const userIdsWithInbox = new Set(inboxUsers.map(iu => iu.user_id));

      const result: InboxUser[] = profiles
        .filter(p => userIdsWithInbox.has(p.id))
        .map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          memberships: inboxUsers
            .filter(iu => iu.user_id === profile.id)
            .map(iu => {
              const inbox = inboxMap.get(iu.inbox_id);
              const instance = inbox ? instanceMap.get(inbox.instance_id) : undefined;
              return {
                inbox_id: iu.inbox_id,
                inbox_name: inbox?.name || 'Desconhecida',
                instance_name: instance?.name || '',
                role: iu.role as InboxRole,
              };
            }),
        }));

      setTeamUsers(result);
    } catch {
      toast.error('Erro ao carregar equipe');
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchInboxes();
    fetchInstances();
    fetchUsers();
    fetchTeam();
  }, [isSuperAdmin, fetchInboxes, fetchInstances, fetchUsers, fetchTeam]);

  // Guard after all hooks
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  // ── Handlers: Inbox ────────────────────────────────────────────────────────
  const handleCreateInbox = async () => {
    if (!newInboxName.trim() || !selectedInstanceId) {
      toast.error('Preencha nome e instância');
      return;
    }
    setIsCreatingInbox(true);
    try {
      const { error } = await supabase.from('inboxes').insert({
        name: newInboxName.trim(),
        instance_id: selectedInstanceId,
        created_by: user!.id,
        webhook_url: webhookUrl.trim() || null,
        webhook_outgoing_url: webhookOutgoingUrl.trim() || null,
      } as any);
      if (error) throw error;
      toast.success('Caixa criada!');
      setIsCreateInboxOpen(false);
      setNewInboxName(''); setSelectedInstanceId(''); setWebhookUrl(''); setWebhookOutgoingUrl('');
      fetchInboxes();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar caixa');
    } finally {
      setIsCreatingInbox(false);
    }
  };

  const handleDeleteInbox = async () => {
    if (!inboxToDelete) return;
    setIsDeletingInbox(true);
    try {
      await supabase.from('inbox_users').delete().eq('inbox_id', inboxToDelete.id);
      await supabase.from('labels').delete().eq('inbox_id', inboxToDelete.id);
      const { error } = await supabase.from('inboxes').delete().eq('id', inboxToDelete.id);
      if (error) throw error;
      toast.success('Caixa excluída');
      setInboxToDelete(null);
      fetchInboxes();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    } finally {
      setIsDeletingInbox(false);
    }
  };

  const handleSaveWebhook = async (inboxId: string) => {
    setIsSavingWebhook(true);
    try {
      const { error } = await supabase.from('inboxes').update({ webhook_url: editWebhookValue.trim() || null } as any).eq('id', inboxId);
      if (error) throw error;
      toast.success('Webhook atualizado!');
      setEditingWebhookId(null);
      fetchInboxes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  const handleSaveOutgoing = async (inboxId: string) => {
    setIsSavingOutgoing(true);
    try {
      const { error } = await supabase.from('inboxes').update({ webhook_outgoing_url: editOutgoingValue.trim() || null } as any).eq('id', inboxId);
      if (error) throw error;
      toast.success('Webhook Outgoing atualizado!');
      setEditingOutgoingId(null);
      fetchInboxes();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSavingOutgoing(false);
    }
  };

  // ── Handlers: Users ────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Email e senha são obrigatórios');
      return;
    }
    setIsCreatingUser(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, full_name: newUserName, role: newUserRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');
      toast.success('Usuário criado!');
      setIsCreateUserOpen(false);
      setNewUserEmail(''); setNewUserPassword(''); setNewUserName(''); setNewUserRole('user');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar usuário');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      toast.success('Papel atualizado!');
      fetchUsers();
    } catch {
      toast.error('Erro ao alterar papel');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: userToDelete.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao excluir');
      toast.success('Usuário excluído!');
      setUserToDelete(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // ── Handlers: Team ─────────────────────────────────────────────────────────
  const handleRemoveMembership = async () => {
    if (!removeMembership) return;
    setIsRemovingMembership(true);
    try {
      const { error } = await supabase
        .from('inbox_users')
        .delete()
        .eq('user_id', removeMembership.userId)
        .eq('inbox_id', removeMembership.inboxId);
      if (error) throw error;
      toast.success('Membro removido da caixa');
      setRemoveMembership(null);
      fetchTeam();
    } catch {
      toast.error('Erro ao remover membro');
    } finally {
      setIsRemovingMembership(false);
    }
  };

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredInboxes = inboxes.filter(
    i => i.name.toLowerCase().includes(inboxSearch.toLowerCase()) ||
         i.instance_name.toLowerCase().includes(inboxSearch.toLowerCase())
  );
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(usersSearch.toLowerCase()) ||
         u.full_name?.toLowerCase().includes(usersSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || u.app_role === userRoleFilter;
    return matchesSearch && matchesRole;
  });
  const filteredTeam = teamUsers.filter(
    u => u.email.toLowerCase().includes(teamSearch.toLowerCase()) ||
         u.full_name?.toLowerCase().includes(teamSearch.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-fade-in">

      {/* ── Page Header ── */}
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
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Novo
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setIsCreateInboxOpen(true)}>
              <Inbox className="w-4 h-4 mr-2" />
              Nova Caixa de Entrada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreateUserOpen(true)}>
              <Shield className="w-4 h-4 mr-2" />
              Novo Usuário
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCreateTeamUserOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Membro de Atendimento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Stats Bar ── */}
      <AdminStatsBar inboxes={inboxes} users={users} teamUsers={teamUsers} />

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto no-scrollbar h-11">
          <TabsTrigger value="inboxes" className="gap-2 min-h-[36px]">
            <Inbox className="w-4 h-4" />
            <span className={isMobile ? 'sr-only' : ''}>{!isMobile && 'Caixas'}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{inboxes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 min-h-[36px]">
            <Shield className="w-4 h-4" />
            <span className={isMobile ? 'sr-only' : ''}>{!isMobile && 'Usuários'}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 min-h-[36px]">
            <Headphones className="w-4 h-4" />
            <span className={isMobile ? 'sr-only' : ''}>{!isMobile && 'Equipe'}</span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{teamUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-2 min-h-[36px]">
            <Wrench className="w-4 h-4" />
            <span className={isMobile ? 'sr-only' : ''}>{!isMobile && 'Ferramentas'}</span>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Caixas de Entrada                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="inboxes" className="mt-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar caixas..."
              className="pl-9"
              value={inboxSearch}
              onChange={e => setInboxSearch(e.target.value)}
            />
          </div>

          {inboxesLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
            </div>
          ) : filteredInboxes.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhuma caixa encontrada" desc="Crie a primeira caixa de entrada" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredInboxes.map(inbox => (
                <InboxCard
                  key={inbox.id}
                  inbox={inbox}
                  onManageMembers={() => setManageInbox(inbox)}
                  onDelete={() => setInboxToDelete(inbox)}
                  editingWebhookId={editingWebhookId}
                  editWebhookValue={editWebhookValue}
                  setEditWebhookValue={setEditWebhookValue}
                  setEditingWebhookId={setEditingWebhookId}
                  handleSaveWebhook={handleSaveWebhook}
                  isSavingWebhook={isSavingWebhook}
                  editingOutgoingId={editingOutgoingId}
                  editOutgoingValue={editOutgoingValue}
                  setEditOutgoingValue={setEditOutgoingValue}
                  setEditingOutgoingId={setEditingOutgoingId}
                  handleSaveOutgoing={handleSaveOutgoing}
                  isSavingOutgoing={isSavingOutgoing}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Usuários                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="mt-5 space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários..."
                className="pl-9"
                value={usersSearch}
                onChange={e => setUsersSearch(e.target.value)}
              />
            </div>
            {/* Role filter chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {([
                { value: 'all', label: 'Todos', count: users.length },
                { value: 'super_admin', label: 'Admin', count: users.filter(u => u.app_role === 'super_admin').length },
                { value: 'gerente', label: 'Gerente', count: users.filter(u => u.app_role === 'gerente').length },
                { value: 'user', label: 'Atendente', count: users.filter(u => u.app_role === 'user').length },
              ] as { value: 'all' | AppRole; label: string; count: number }[]).map(f => (
                <button
                  key={f.value}
                  onClick={() => setUserRoleFilter(f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap min-h-[32px] ${
                    userRoleFilter === f.value
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50'
                  }`}
                >
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    userRoleFilter === f.value ? 'bg-primary/20' : 'bg-muted/50'
                  }`}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {usersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum usuário encontrado" desc="Crie o primeiro usuário" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredUsers.map(u => (
                <UserCard
                  key={u.id}
                  user={u}
                  onChangeRole={handleChangeRole}
                  onManageInstances={() => { setManageInstancesUser(u); setIsManageInstancesOpen(true); }}
                  onDelete={() => setUserToDelete(u)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Equipe                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="team" className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar membros..."
                className="pl-9"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIsCreateTeamUserOpen(true)}>
              <UserPlus className="w-4 h-4" />
              Adicionar Membro
            </Button>
          </div>

          {teamLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
          ) : filteredTeam.length === 0 ? (
            <EmptyState icon={Headphones} title="Nenhum membro na equipe" desc="Adicione membros às caixas de atendimento" />
          ) : (
            <TeamSection
              teamUsers={filteredTeam}
              inboxes={inboxes}
              onRemoveMembership={(userId, inboxId, userName, inboxName) =>
                setRemoveMembership({ userId, inboxId, userName, inboxName })
              }
            />
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: Ferramentas (Backup + Migração merged)                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tools" className="mt-5 space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Backup
            </h2>
            <BackupModule />
          </div>
          <div className="border-t border-border/30 pt-6 space-y-2">
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <MonitorSmartphone className="w-5 h-5 text-primary" />
              Migração
            </h2>
            <MigrationWizard />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Create Inbox */}
      <Dialog open={isCreateInboxOpen} onOpenChange={setIsCreateInboxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Caixa de Entrada</DialogTitle>
            <DialogDescription>Vincule uma caixa a uma instância WhatsApp</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Suporte, Vendas..." value={newInboxName} onChange={e => setNewInboxName(e.target.value)} />
            </div>
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
            <div className="space-y-2">
              <Label>Webhook URL (n8n)</Label>
              <Input placeholder="https://seu-n8n.com/webhook/..." value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Webhook Outgoing URL</Label>
              <Input placeholder="https://seu-n8n.com/webhook/outgoing..." value={webhookOutgoingUrl} onChange={e => setWebhookOutgoingUrl(e.target.value)} />
            </div>
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
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input placeholder="Nome do usuário" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="email@exemplo.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso *</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'super_admin', label: 'Super Admin', desc: 'Acesso total ao sistema', Icon: Shield },
                  { value: 'gerente', label: 'Gerente', desc: 'Atendimento e CRM', Icon: Briefcase },
                  { value: 'user', label: 'Atendente', desc: 'Apenas suas caixas', Icon: Headphones },
                ] as { value: AppRole; label: string; desc: string; Icon: React.ElementType }[]).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewUserRole(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                      newUserRole === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                    }`}
                  >
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

      {/* Delete Inbox */}
      <AlertDialog open={!!inboxToDelete} onOpenChange={open => !open && setInboxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir caixa de entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{inboxToDelete?.name}</strong> e todos seus membros e etiquetas serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInbox} disabled={isDeletingInbox} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingInbox ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User */}
      <AlertDialog open={!!userToDelete} onOpenChange={open => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir usuário?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{userToDelete?.full_name || userToDelete?.email}</strong> será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeletingUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingUser ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Membership */}
      <AlertDialog open={!!removeMembership} onOpenChange={open => !open && setRemoveMembership(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro da caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeMembership && (
                <><strong>{removeMembership.userName}</strong> será removido de <strong>{removeMembership.inboxName}</strong>. A conta não será excluída.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMembership} disabled={isRemovingMembership} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isRemovingMembership ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Inbox Members */}
      {manageInbox && (
        <ManageInboxUsersDialog
          open={!!manageInbox}
          onOpenChange={open => !open && setManageInbox(null)}
          inboxId={manageInbox.id}
          inboxName={manageInbox.name}
          onUpdate={() => { fetchInboxes(); fetchTeam(); }}
        />
      )}

      {/* Manage User Instances */}
      <ManageUserInstancesDialog
        open={isManageInstancesOpen}
        onOpenChange={setIsManageInstancesOpen}
        user={manageInstancesUser}
        onSave={fetchUsers}
      />

      {/* Create Team Member */}
      <CreateInboxUserDialog
        open={isCreateTeamUserOpen}
        onOpenChange={setIsCreateTeamUserOpen}
        onCreated={() => { fetchTeam(); fetchUsers(); }}
      />
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

export default AdminPanel;
