import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, Users, Trash2 } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from './constants';
import type { InboxRole, InboxUser } from './types';

interface Props {
  teamUsers: InboxUser[];
  onRemoveMembership: (userId: string, inboxId: string, userName: string, inboxName: string) => void;
  onChangeTeamRole: (userId: string, inboxId: string, newRole: InboxRole) => void;
}

const TeamSection = ({ teamUsers, onRemoveMembership, onChangeTeamRole }: Props) => {
  const groupedByInbox = useMemo(() => {
    const map = new Map<string, { inboxName: string; instanceName: string; members: { userId: string; userName: string; email: string; role: InboxRole }[] }>();
    teamUsers.forEach(u => {
      u.memberships.forEach(m => {
        if (!map.has(m.inbox_id)) {
          map.set(m.inbox_id, { inboxName: m.inbox_name, instanceName: m.instance_name, members: [] });
        }
        map.get(m.inbox_id)!.members.push({ userId: u.id, userName: u.full_name || u.email, email: u.email, role: m.role });
      });
    });
    return Array.from(map.entries());
  }, [teamUsers]);

  if (groupedByInbox.length === 0) return null;

  return (
    <div className="space-y-4">
      {groupedByInbox.map(([inboxId, group]) => (
        <div key={inboxId} className="glass-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{group.inboxName}</p>
              {group.instanceName && <p className="text-xs text-muted-foreground">{group.instanceName}</p>}
            </div>
            <ActionTooltip label="Total de membros nesta caixa">
              <Badge variant="outline" className="ml-auto shrink-0 gap-1 cursor-default">
                <Users className="w-3 h-3" />{group.members.length}
              </Badge>
            </ActionTooltip>
          </div>

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
                  <Select value={member.role} onValueChange={val => onChangeTeamRole(member.userId, inboxId, val as InboxRole)}>
                    <ActionTooltip label="Alterar papel do membro">
                      <SelectTrigger className={`h-7 w-auto min-w-[90px] text-[11px] border ${ROLE_COLORS[member.role]}`}>
                        <SelectValue />
                      </SelectTrigger>
                    </ActionTooltip>
                    <SelectContent>
                      {(['admin', 'gestor', 'agente'] as InboxRole[]).map(role => (
                        <SelectItem key={role} value={role} className="text-xs">{ROLE_LABELS[role]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ActionTooltip label="Remover membro">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveMembership(member.userId, inboxId, member.userName, group.inboxName)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </ActionTooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamSection;
