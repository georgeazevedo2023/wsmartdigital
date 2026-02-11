import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  MessageSquareMore,
  LayoutDashboard,
  MonitorSmartphone,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  Clock,
  Send,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
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

interface SidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

const Sidebar = ({ isMobile = false, onNavigate }: SidebarProps) => {
  const location = useLocation();
  const { id: instanceId } = useParams<{ id: string }>();
  const { profile, isSuperAdmin, signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [instancesOpen, setInstancesOpen] = useState(true);
  const [broadcastOpen, setBroadcastOpen] = useState(true);
  const [instances, setInstances] = useState<Instance[]>([]);

  // No mobile, nunca está colapsado
  const isCollapsed = isMobile ? false : collapsed;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Headphones, label: 'Atendimento', path: '/dashboard/helpdesk' },
    { icon: Clock, label: 'Agendamentos', path: '/dashboard/scheduled' },
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

  // Classe base para links colapsados (centralizado)
  const collapsedLinkClass = cn(
    'flex items-center justify-center w-full px-3 py-2.5 rounded-lg transition-all'
  );

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-full flex flex-col transition-all duration-300',
          isMobile ? 'w-full sidebar-glass' : 'sidebar-glass',
          !isMobile && (isCollapsed ? 'w-20' : 'w-64')
        )}
      >
      {/* Header */}
      <div className={cn(
        'h-16 flex items-center justify-between px-4 border-b border-primary/10',
        isMobile && 'hidden' // No mobile, o header está no MobileHeader
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquareMore className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg">WsmartQR</span>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn('shrink-0', isCollapsed && 'mx-auto')}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>
              <Link
                to={item.path}
                onClick={handleLinkClick}
                className={cn(
                  isCollapsed ? collapsedLinkClass : 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            </TooltipTrigger>
            {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
          </Tooltip>
        ))}

        {/* Disparador - Collapsible apenas quando NÃO colapsado */}
        {!isCollapsed ? (
          <Collapsible open={broadcastOpen} onOpenChange={setBroadcastOpen}>
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
                <span className="font-medium flex-1">Disparador</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform',
                    broadcastOpen && 'transform rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-5 mt-1 space-y-1">
              <Link
                to="/dashboard/broadcast"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                  isActive('/dashboard/broadcast')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <span>Grupos</span>
              </Link>
              <Link
                to="/dashboard/broadcast/history"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                  isActive('/dashboard/broadcast/history')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <span>Histórico</span>
              </Link>
              <Link
                to="/dashboard/broadcast/leads"
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                  isActive('/dashboard/broadcast/leads')
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <span>Leads</span>
              </Link>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard/broadcast"
                onClick={handleLinkClick}
                className={cn(
                  collapsedLinkClass,
                  isBroadcastActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <Send className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Disparador</TooltipContent>
          </Tooltip>
        )}

        {/* Instâncias - Collapsible apenas quando NÃO colapsado */}
        {!isCollapsed ? (
          <Collapsible open={instancesOpen} onOpenChange={setInstancesOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left',
                  isInstancesActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <MonitorSmartphone className="w-5 h-5 shrink-0" />
                <span className="font-medium flex-1">Instâncias</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform',
                    instancesOpen && 'transform rotate-180'
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-5 mt-1 space-y-1">
              <Link
                to="/dashboard/instances"
                onClick={handleLinkClick}
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
                  onClick={handleLinkClick}
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
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                >
                  <span>+{instances.length - 5} mais...</span>
                </Link>
              )}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard/instances"
                onClick={handleLinkClick}
                className={cn(
                  collapsedLinkClass,
                  isInstancesActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <MonitorSmartphone className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Instâncias</TooltipContent>
          </Tooltip>
        )}

        {isSuperAdmin && (
          <>
            <div className="pt-4 pb-2">
              {!isCollapsed && (
                <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </div>
              )}
            </div>
            {adminItems.map((item) => (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={cn(
                      isCollapsed ? collapsedLinkClass : 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent'
                    )}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {!isCollapsed && <span className="font-medium">{item.label}</span>}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-primary/10">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg',
            isCollapsed && 'justify-center'
          )}
        >
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
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            'w-full mt-2 text-muted-foreground hover:text-destructive',
            isCollapsed ? 'px-0 justify-center' : 'justify-start'
          )}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </aside>
    </TooltipProvider>
  );
};

export default Sidebar;
