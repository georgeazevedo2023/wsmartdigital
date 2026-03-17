import EmptyState from '@/components/ui/empty-state';
import InstanceCard from '@/components/dashboard/InstanceCard';
import { Server } from 'lucide-react';
import type { Instance } from '@/hooks/useInstances';

interface InstancesGridProps {
  instances: Instance[];
  isSuperAdmin: boolean;
  onConnect: (instance: Instance) => void;
  onDelete?: (instance: Instance) => void;
  onManageAccess?: (instance: Instance) => void;
}

export const InstancesGrid = ({
  instances, isSuperAdmin, onConnect, onDelete, onManageAccess,
}: InstancesGridProps) => {
  if (instances.length === 0) {
    return (
      <EmptyState
        icon={Server}
        title="Nenhuma instância encontrada"
        description={isSuperAdmin ? 'Clique em "Nova Instância" para criar uma' : undefined}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {instances.map((instance) => (
        <InstanceCard
          key={instance.id}
          instance={instance}
          showOwner={isSuperAdmin}
          onConnect={onConnect}
          onDelete={isSuperAdmin ? onDelete : undefined}
          onManageAccess={isSuperAdmin ? onManageAccess : undefined}
        />
      ))}
    </div>
  );
};
