import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SubItem {
  label: string;
  path: string;
}

interface Props {
  icon: LucideIcon;
  label: string;
  tooltipLabel?: string;
  basePath: string;
  subItems?: SubItem[];
  isCollapsed: boolean;
  isActive: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collapsedLinkClass: string;
  onClick?: () => void;
  /** Custom children for instances list */
  children?: React.ReactNode;
}

const SidebarCollapsibleMenu = ({
  icon: Icon, label, tooltipLabel, basePath, subItems,
  isCollapsed, isActive, open, onOpenChange, collapsedLinkClass, onClick, children,
}: Props) => {
  const location = useLocation();
  const isItemActive = (path: string) => location.pathname === path;

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={basePath}
            onClick={onClick}
            className={cn(
              collapsedLinkClass,
              isActive
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <Icon className="w-5 h-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{tooltipLabel || label}</TooltipContent>
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
          <Icon className="w-5 h-5 shrink-0" />
          <span className="font-medium flex-1">{label}</span>
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-5 mt-1 space-y-1">
        {subItems?.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
              isItemActive(item.path)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
            )}
          >
            <span>{item.label}</span>
          </Link>
        ))}
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SidebarCollapsibleMenu;
