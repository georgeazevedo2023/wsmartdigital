import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { MessageSquareMore, ChevronLeft, ChevronRight, ShieldCheck, Send, MonitorSmartphone, Kanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { NAV_ITEMS, ADMIN_ITEMS, BROADCAST_SUBITEMS } from '@/components/sidebar/constants';
import type { Instance, InstanceWithInboxes, InboxItem } from '@/components/sidebar/constants';
import SidebarNavItem from '@/components/sidebar/SidebarNavItem';
import SidebarHelpdeskMenu from '@/components/sidebar/SidebarHelpdeskMenu';
import SidebarCollapsibleMenu from '@/components/sidebar/SidebarCollapsibleMenu';
import SidebarUserSection from '@/components/sidebar/SidebarUserSection';

interface SidebarProps {
  isMobile?: boolean;
  onNavigate?: () => void;
}

const Sidebar = ({ isMobile = false, onNavigate }: SidebarProps) => {
  const location = useLocation();
  const { id: instanceId } = useParams<{ id: string }>();
  const { profile, isSuperAdmin, isGerente, signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [instancesOpen, setInstancesOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [instancesWithInboxes, setInstancesWithInboxes] = useState<InstanceWithInboxes[]>([]);

  const isCollapsed = isMobile ? false : collapsed;
  const isActive = (path: string) => location.pathname === path;
  const isInstancesActive = location.pathname.includes('/dashboard/instances');
  const isBroadcastActive = location.pathname.startsWith('/dashboard/broadcast');
  const isHelpdeskActive = location.pathname.startsWith('/dashboard/helpdesk');

  const collapsedLinkClass = 'flex items-center justify-center w-full px-3 py-2.5 rounded-lg transition-all';

  const handleLinkClick = () => onNavigate?.();

  const fetchInstances = async () => {
    try {
      if (isSuperAdmin) {
        const [instancesRes, inboxesRes] = await Promise.all([
          supabase.from('instances').select('id, name, status').order('name'),
          supabase.from('inboxes').select('id, name, instance_id').order('name'),
        ]);
        if (instancesRes.error) throw instancesRes.error;
        const allInstances = instancesRes.data || [];
        setInstances(allInstances);
        const allInboxes: InboxItem[] = inboxesRes.data || [];
        setInstancesWithInboxes(
          allInstances
            .map(inst => ({ ...inst, inboxes: allInboxes.filter(ib => ib.instance_id === inst.id) }))
            .filter(inst => inst.inboxes.length > 0)
        );
      } else {
        const { data: userInboxes } = await supabase
          .from('inbox_users')
          .select('inboxes(id, name, instance_id)')
          .eq('user_id', user!.id);
        const inboxList: InboxItem[] = (userInboxes || []).map((d: any) => d.inboxes).filter(Boolean);
        const instanceIds = [...new Set(inboxList.map(ib => ib.instance_id))];
        if (instanceIds.length > 0) {
          const { data: instData } = await supabase
            .from('instances').select('id, name, status').in('id', instanceIds).order('name');
          const instList = instData || [];
          setInstances(instList);
          setInstancesWithInboxes(
            instList
              .map(inst => ({ ...inst, inboxes: inboxList.filter(ib => ib.instance_id === inst.id) }))
              .filter(inst => inst.inboxes.length > 0)
          );
        } else {
          setInstances([]);
          setInstancesWithInboxes([]);
        }
      }
    } catch (error) {
      console.error('Error fetching instances:', error);
    }
  };

  useEffect(() => {
    if (user) fetchInstances();
  }, [user, isSuperAdmin]);

  useEffect(() => {
    const handler = () => fetchInstances();
    window.addEventListener('instances-updated', handler);
    return () => window.removeEventListener('instances-updated', handler);
  }, []);

  return (
    <aside
      className={cn(
        'h-full flex flex-col transition-all duration-300',
        isMobile ? 'w-full sidebar-glass' : 'sidebar-glass',
        !isMobile && (isCollapsed ? 'w-20' : 'w-64')
      )}
    >
      {/* Header */}
      <div className={cn('h-16 flex items-center justify-between px-4 border-b border-primary/10', isMobile && 'hidden')}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquareMore className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-lg">WsmartQR</span>
          </div>
        )}
        {!isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className={cn('shrink-0', isCollapsed && 'mx-auto')}>
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {isSuperAdmin && NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.path} item={item} isActive={isActive(item.path)} isCollapsed={isCollapsed} collapsedLinkClass={collapsedLinkClass} onClick={handleLinkClick} />
        ))}

        {/* Atendimento */}
        <SidebarHelpdeskMenu
          isCollapsed={isCollapsed} isActive={isHelpdeskActive}
          open={helpdeskOpen} onOpenChange={setHelpdeskOpen}
          instancesWithInboxes={instancesWithInboxes}
          collapsedLinkClass={collapsedLinkClass} onClick={handleLinkClick}
        />

        {/* CRM */}
        {(isSuperAdmin || isGerente) && (
          <SidebarNavItem
            item={{ icon: Kanban, label: 'CRM', path: '/dashboard/crm' }}
            isActive={location.pathname.startsWith('/dashboard/crm')}
            isCollapsed={isCollapsed} collapsedLinkClass={collapsedLinkClass} onClick={handleLinkClick}
          />
        )}

        {/* Disparador */}
        {isSuperAdmin && (
          <SidebarCollapsibleMenu
            icon={Send} label="Disparador" basePath="/dashboard/broadcast"
            subItems={BROADCAST_SUBITEMS}
            isCollapsed={isCollapsed} isActive={isBroadcastActive}
            open={broadcastOpen} onOpenChange={setBroadcastOpen}
            collapsedLinkClass={collapsedLinkClass} onClick={handleLinkClick}
          />
        )}

        {/* Instâncias */}
        {isSuperAdmin && (
          <SidebarCollapsibleMenu
            icon={MonitorSmartphone} label="Instâncias" basePath="/dashboard/instances"
            isCollapsed={isCollapsed} isActive={isInstancesActive}
            open={instancesOpen} onOpenChange={setInstancesOpen}
            collapsedLinkClass={collapsedLinkClass} onClick={handleLinkClick}
          >
            <Link to="/dashboard/instances" onClick={handleLinkClick}
              className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                isActive('/dashboard/instances') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              )}>
              <span>Todas as instâncias</span>
            </Link>
            {instances.slice(0, 5).map((instance) => (
              <Link key={instance.id} to={`/dashboard/instances/${instance.id}`} onClick={handleLinkClick}
                className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                  instanceId === instance.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}>
                <span className={cn('w-2 h-2 rounded-full shrink-0', instance.status === 'connected' ? 'bg-success' : 'bg-muted-foreground')} />
                <span className="truncate">{instance.name}</span>
              </Link>
            ))}
            {instances.length > 5 && (
              <Link to="/dashboard/instances" onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">
                <span>+{instances.length - 5} mais...</span>
              </Link>
            )}
          </SidebarCollapsibleMenu>
        )}

        {/* Admin section */}
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
            {ADMIN_ITEMS.map((item) => (
              <SidebarNavItem key={item.path} item={item} isActive={isActive(item.path)} isCollapsed={isCollapsed} collapsedLinkClass={collapsedLinkClass} onClick={handleLinkClick} />
            ))}
          </>
        )}
      </nav>

      <SidebarUserSection
        profile={profile} isSuperAdmin={isSuperAdmin} isGerente={isGerente}
        isCollapsed={isCollapsed} onSignOut={signOut}
      />
    </aside>
  );
};

export default Sidebar;
