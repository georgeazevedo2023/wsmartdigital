import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import { MonitorSmartphone, Pencil, Settings, Trash2 } from 'lucide-react';
import { APP_ROLE_CONFIG } from './constants';
import type { AppRole, UserWithRole } from './types';

interface Props {
  user: UserWithRole;
  onChangeRole: (userId: string, role: AppRole) => void;
  onManageInstances: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const UserCard = ({ user: u, onChangeRole, onManageInstances, onDelete, onEdit }: Props) => {
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
              <RoleIcon className="w-3 h-3" />{roleConfig.label}
            </Badge>
            {u.instance_count > 0 && (
              <ActionTooltip label={`${u.instance_count} instância(s) vinculada(s)`}>
                <Badge variant="outline" className="gap-1 text-[11px] h-6 cursor-default">
                  <MonitorSmartphone className="w-3 h-3" />{u.instance_count}
                </Badge>
              </ActionTooltip>
            )}
          </div>
        </div>
      </div>

      {/* Role selector */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border/30">
        {(['super_admin', 'gerente', 'user'] as AppRole[]).map(role => {
          const config = APP_ROLE_CONFIG[role];
          const Icon = config.icon;
          const isActive = u.app_role === role;
          return (
            <ActionTooltip key={role} label={`Definir como ${config.label}`}>
              <button
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
            </ActionTooltip>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-border/20">
        <ActionTooltip label="Editar nome do usuário">
          <Button variant="ghost" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5" />Editar
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Gerenciar instâncias">
          <Button variant="ghost" size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={onManageInstances}>
            <Settings className="w-3.5 h-3.5" />Instâncias
          </Button>
        </ActionTooltip>
        <ActionTooltip label="Excluir usuário">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </ActionTooltip>
      </div>
    </div>
  );
};

export default UserCard;
