import { Inbox, Users, Headphones } from 'lucide-react';
import type { InboxWithDetails, UserWithRole, InboxUser } from './types';

interface Props {
  inboxes: InboxWithDetails[];
  users: UserWithRole[];
  teamUsers: InboxUser[];
}

const AdminStatsBar = ({ inboxes, users, teamUsers }: Props) => {
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

export default AdminStatsBar;
