import { Link, useLocation, useParams } from 'react-router-dom';
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
  ChevronDown,
  Calendar,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

interface Instance {
  id: string;
  name: string;
  status: string;
}

const Sidebar = () => {
  const location = useLocation();
  const { id: instanceId } = useParams<{ id: string }>();
  const { profile, isSuperAdmin, signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [instancesOpen, setInstancesOpen] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(true);
  const [instances, setInstances] = useState<Instance[]>([]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Calendar, label: 'Agendamentos', path: '/dashboard/scheduled' },
  ];

  const adminItems = [
    { icon: Users, label: 'Usuários', path: '/dashboard/users' },
    { icon: Settings, label: 'Configurações', path: '/dashboard/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isInstancesActive = location.pathname.includes('/dashboard/instances');
  const isBroadcastActive = location.pathname.startsWith('/dashboard/broadcast');

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setInstances(data || []);
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInstances();
    }
  }, [user]);

  // Listen for instance updates (e.g., after sync/delete orphans)
  useEffect(() => {
    const handleInstancesUpdate = () => {
      fetchInstances();
    };

    window.addEventListener('instances-updated', handleInstancesUpdate);
    return () => {
      window.removeEventListener('instances-updated', handleInstancesUpdate);
    };
  }, []);

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

        {/* Disparador com submenu */}
        <Collapsible open={broadcastOpen && !collapsed} onOpenChange={setBroadcastOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left',
                isBroadcastActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Send className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="font-medium flex-1">Disparador</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      broadcastOpen && 'transform rotate-180'
                    )}
                  />
                </>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-5 mt-1 space-y-1">
            <Link
              to="/dashboard/broadcast"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                isActive('/dashboard/broadcast')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              <span>Novo disparo</span>
            </Link>
            <Link
              to="/dashboard/broadcast/history"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                isActive('/dashboard/broadcast/history')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              <span>Histórico</span>
            </Link>
          </CollapsibleContent>
        </Collapsible>

        {/* Link simples para disparador quando colapsado */}
        {collapsed && (
          <Link
            to="/dashboard/broadcast"
            className={cn(
              'flex items-center justify-center px-3 py-2.5 rounded-lg transition-all',
              isBroadcastActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <Send className="w-5 h-5" />
          </Link>
        )}

        {/* Instâncias com submenu */}
        <Collapsible open={instancesOpen && !collapsed} onOpenChange={setInstancesOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left',
                isInstancesActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              )}
            >
              <Server className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="font-medium flex-1">Instâncias</span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      instancesOpen && 'transform rotate-180'
                    )}
                  />
                </>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-5 mt-1 space-y-1">
            <Link
              to="/dashboard/instances"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                isActive('/dashboard/instances')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}
            >
              <span>Todas as instâncias</span>
            </Link>
            {instances.slice(0, 5).map((instance) => (
              <Link
                key={instance.id}
                to={`/dashboard/instances/${instance.id}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                  instanceId === instance.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    instance.status === 'connected' ? 'bg-success' : 'bg-muted-foreground'
                  )}
                />
                <span className="truncate">{instance.name}</span>
              </Link>
            ))}
            {instances.length > 5 && (
              <Link
                to="/dashboard/instances"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              >
                <span>+{instances.length - 5} mais...</span>
              </Link>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Link simples para instâncias quando colapsado */}
        {collapsed && (
          <Link
            to="/dashboard/instances"
            className={cn(
              'flex items-center justify-center px-3 py-2.5 rounded-lg transition-all',
              isInstancesActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <Server className="w-5 h-5" />
          </Link>
        )}

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
