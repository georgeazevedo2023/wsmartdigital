import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
  isSuperAdmin: boolean;
  isGerente: boolean;
  isCollapsed: boolean;
  onSignOut: () => void;
}

const SidebarUserSection = ({ profile, isSuperAdmin, isGerente, isCollapsed, onSignOut }: Props) => (
  <div className="p-3 border-t border-primary/10">
    <div className={cn('flex items-center gap-3 p-2 rounded-lg', isCollapsed && 'justify-center')}>
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{profile?.full_name || 'Usuário'}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          <span className={cn(
            'inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5 mt-0.5',
            isSuperAdmin
              ? 'bg-primary/15 text-primary'
              : isGerente
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-muted text-muted-foreground'
          )}>
            {isSuperAdmin ? 'Super Admin' : isGerente ? 'Gerente' : 'Atendente'}
          </span>
        </div>
      )}
    </div>
    <Button
      variant="ghost"
      onClick={onSignOut}
      className={cn(
        'w-full mt-2 text-muted-foreground hover:text-destructive',
        isCollapsed ? 'px-0 justify-center' : 'justify-start'
      )}
    >
      <LogOut className="w-4 h-4" />
      {!isCollapsed && <span className="ml-2">Sair</span>}
    </Button>
  </div>
);

export default SidebarUserSection;
