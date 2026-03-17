import type { Database } from '@/integrations/supabase/types';

export type InboxRole = Database['public']['Enums']['inbox_role'];
export type AppRole = 'super_admin' | 'gerente' | 'user';

export interface InboxWithDetails {
  id: string;
  name: string;
  instance_id: string;
  instance_name: string;
  instance_status: string;
  created_by: string;
  created_at: string;
  member_count: number;
  webhook_url: string | null;
  webhook_outgoing_url: string | null;
}

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  is_super_admin: boolean;
  app_role: AppRole;
  instance_count: number;
  instances: { id: string; name: string; phone: string | null }[];
}

export interface InboxMembership {
  inbox_id: string;
  inbox_name: string;
  instance_name: string;
  role: InboxRole;
}

export interface InboxUser {
  id: string;
  email: string;
  full_name: string | null;
  memberships: InboxMembership[];
}
