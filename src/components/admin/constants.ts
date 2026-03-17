import { Shield, Briefcase, Headphones } from 'lucide-react';
import type { InboxRole, AppRole } from './types';

export const ROLE_LABELS: Record<InboxRole, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  agente: 'Agente',
};

export const ROLE_COLORS: Record<InboxRole, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  gestor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  agente: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export const APP_ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; colorClass: string }> = {
  super_admin: { label: 'Admin', icon: Shield, colorClass: 'bg-primary/10 text-primary border-primary/20' },
  gerente: { label: 'Gerente', icon: Briefcase, colorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  user: { label: 'Atendente', icon: Headphones, colorClass: 'bg-muted text-muted-foreground border-border' },
};
