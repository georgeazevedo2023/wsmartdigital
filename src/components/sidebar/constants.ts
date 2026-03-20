import {
  LayoutDashboard,
  Clock,
  BrainCircuit,
  ShieldCheck,
  Settings,
  FileBarChart,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export interface Instance {
  id: string;
  name: string;
  status: string;
}

export interface InboxItem {
  id: string;
  name: string;
  instance_id: string;
}

export interface InstanceWithInboxes extends Instance {
  inboxes: InboxItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Clock, label: 'Agendamentos', path: '/dashboard/scheduled' },
];

export const ADMIN_ITEMS: NavItem[] = [
  { icon: FileBarChart, label: 'Relatórios', path: '/dashboard/reports' },
  { icon: BrainCircuit, label: 'Inteligência', path: '/dashboard/intelligence' },
  { icon: ShieldCheck, label: 'Administração', path: '/dashboard/admin' },
  { icon: Settings, label: 'Configurações', path: '/dashboard/settings' },
];

export const BROADCAST_SUBITEMS = [
  { label: 'Grupos', path: '/dashboard/broadcast' },
  { label: 'Histórico', path: '/dashboard/broadcast/history' },
  { label: 'Templates', path: '/dashboard/broadcast/templates' },
  { label: 'Leads', path: '/dashboard/broadcast/leads' },
];
