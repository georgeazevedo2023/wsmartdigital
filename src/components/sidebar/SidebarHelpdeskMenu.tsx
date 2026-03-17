import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Headphones, Inbox, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { InstanceWithInboxes } from './constants';

interface Props {
  isCollapsed: boolean;
  isActive: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instancesWithInboxes: InstanceWithInboxes[];
  collapsedLinkClass: string;
  onClick?: () => void;
}

const SidebarHelpdeskMenu = ({ isCollapsed, isActive, open, onOpenChange, instancesWithInboxes, collapsedLinkClass, onClick }: Props) => {
  const location = useLocation();

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/dashboard/helpdesk"
            onClick={onClick}
            className={cn(
              collapsedLinkClass,
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <Headphones className="w-5 h-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Atendimento</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left',
            isActive
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-sidebar-foreground hover:bg-sidebar-accent'
          )}
        >
          <Headphones className="w-5 h-5 shrink-0" />
          <span className="font-medium flex-1">Atendimento</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-5 mt-1 space-y-1">
        {instancesWithInboxes.map((instance) => (
          <div key={instance.id} className="space-y-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', instance.status === 'connected' ? 'bg-success' : 'bg-muted-foreground')} />
              <span className="truncate">{instance.name}</span>
            </div>
            {instance.inboxes.map((inbox) => (
              <Link
                key={inbox.id}
                to={`/dashboard/helpdesk?inbox=${inbox.id}`}
                onClick={onClick}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm pl-6',
                  location.search.includes(inbox.id)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                )}
              >
                <Inbox className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{inbox.name}</span>
              </Link>
            ))}
          </div>
        ))}
        {instancesWithInboxes.length === 0 && (
          <span className="px-3 py-2 text-xs text-muted-foreground">Nenhuma caixa configurada</span>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SidebarHelpdeskMenu;
