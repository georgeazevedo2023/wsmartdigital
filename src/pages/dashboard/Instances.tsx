import { useInstances } from '@/hooks/useInstances';
import SyncInstancesDialog from '@/components/dashboard/SyncInstancesDialog';
import ManageInstanceAccessDialog from '@/components/dashboard/ManageInstanceAccessDialog';
import { CreateInstanceDialog } from '@/components/instance/CreateInstanceDialog';
import { QrCodeDialog } from '@/components/instance/QrCodeDialog';
import { InstancesGrid } from '@/components/instance/InstancesGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { Search, RefreshCw } from 'lucide-react';

const Instances = () => {
  const h = useInstances();

  if (h.loading) {
    return (
      <PageSkeleton
        header={['w-32']}
        gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        cards={3}
        cardHeight="h-48"
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Instâncias</h1>
          <p className="text-muted-foreground">
            {h.isSuperAdmin ? 'Gerencie todas as instâncias do sistema' : 'Suas instâncias do WhatsApp'}
          </p>
        </div>
        {h.isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => h.setIsSyncDialogOpen(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar
            </Button>
            <CreateInstanceDialog
              open={h.isCreateDialogOpen}
              onOpenChange={h.setIsCreateDialogOpen}
              isCreating={h.isCreating}
              instanceName={h.newInstanceName}
              onInstanceNameChange={h.setNewInstanceName}
              selectedUserId={h.selectedUserId}
              onUserIdChange={h.setSelectedUserId}
              users={h.users}
              onCreate={h.handleCreateInstance}
            />
          </div>
        )}

        <SyncInstancesDialog
          open={h.isSyncDialogOpen}
          onOpenChange={h.setIsSyncDialogOpen}
          onSync={h.fetchInstances}
        />

        <ManageInstanceAccessDialog
          open={h.isAccessDialogOpen}
          onOpenChange={h.setIsAccessDialogOpen}
          instance={h.selectedInstanceForAccess}
          onSave={h.fetchInstances}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar instâncias..."
          className="pl-9"
          value={h.searchQuery}
          onChange={(e) => h.setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      <InstancesGrid
        instances={h.filteredInstances}
        isSuperAdmin={h.isSuperAdmin}
        onConnect={h.handleConnect}
        onDelete={h.isSuperAdmin ? h.handleDelete : undefined}
        onManageAccess={h.isSuperAdmin ? h.handleManageAccess : undefined}
      />

      {/* QR Code Dialog */}
      <QrCodeDialog
        open={h.qrDialogOpen}
        onClose={h.handleCloseQrDialog}
        instanceName={h.selectedInstance?.name}
        qrCode={h.qrCode}
        isLoading={h.isLoadingQr}
        onGenerateNew={h.handleGenerateNewQr}
      />
    </div>
  );
};

export default Instances;
