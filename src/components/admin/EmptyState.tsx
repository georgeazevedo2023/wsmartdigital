import type React from 'react';

interface Props {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const EmptyState = ({ icon: Icon, title, desc }: Props) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{desc}</p>
  </div>
);

export default EmptyState;
