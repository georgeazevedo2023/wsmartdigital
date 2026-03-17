import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { NavItem } from './constants';

interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  collapsedLinkClass: string;
  onClick?: () => void;
}

const SidebarNavItem = ({ item, isActive, isCollapsed, collapsedLinkClass, onClick }: SidebarNavItemProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Link
        to={item.path}
        onClick={onClick}
        className={cn(
          isCollapsed ? collapsedLinkClass : 'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
          isActive
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
);

export default SidebarNavItem;
