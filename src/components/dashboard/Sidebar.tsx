import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  LayoutDashboard,
  Server,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

const Sidebar = () => {
  const location = useLocation();
  const { profile, isSuperAdmin, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Server, label: 'Instâncias', path: '/dashboard/instances' },
  ];

  const adminItems = [
    { icon: Users, label: 'Usuários', path: '/dashboard/users' },
    { icon: Settings, label: 'Configurações', path: '/dashboard/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg">WsmartQR</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('shrink-0', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
              isActive(item.path)
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && (
                <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground uppercase tracking-wider">
                  <Shield className="w-3 h-3" />
                  <span>Admin</span>
                </div>
              )}
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            collapsed && 'justify-center'
          )}
        >
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile?.full_name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            'w-full mt-2 text-muted-foreground hover:text-destructive',
            collapsed ? 'px-0' : 'justify-start'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
