import type React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const EmptyState = ({ icon: Icon, title, description, action, className = '', compact = false }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center text-center text-muted-foreground ${compact ? 'py-8' : 'py-16'} ${className}`}>
    <Icon className={`mx-auto mb-3 opacity-50 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`} />
    <p className="font-medium">{title}</p>
    {description && <p className="text-sm mt-1">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
