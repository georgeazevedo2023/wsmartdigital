import EmptyState from '@/components/ui/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { History, RefreshCw, Filter, Trash2 } from 'lucide-react';
import { formatBR } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBroadcastHistory, getMessageTypeLabel, type BroadcastLog } from '@/hooks/useBroadcastHistory';
import BroadcastHistoryFilters from './BroadcastHistoryFilters';
import BroadcastHistoryLogItem from './BroadcastHistoryLogItem';

interface BroadcastHistoryProps {
  onResend?: (log: BroadcastLog) => void;
}

const BroadcastHistory = ({ onResend }: BroadcastHistoryProps) => {
  const isMobile = useIsMobile();
  const h = useBroadcastHistory();

  if (h.isLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5" /> Histórico de Envios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            <span className="hidden sm:inline">Histórico de Envios</span>
            <span className="sm:hidden">Histórico</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => h.refetch()} disabled={h.isRefetching}>
            <RefreshCw className={`w-4 h-4 ${h.isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          <BroadcastHistoryFilters
            statusFilter={h.statusFilter} onStatusChange={h.setStatusFilter}
            typeFilter={h.typeFilter} onTypeChange={h.setTypeFilter}
            targetFilter={h.targetFilter} onTargetChange={h.setTargetFilter}
            instanceFilter={h.instanceFilter} onInstanceChange={h.setInstanceFilter}
            uniqueInstances={h.uniqueInstances}
            dateFrom={h.dateFrom} onDateFromChange={h.setDateFrom}
            dateTo={h.dateTo} onDateToChange={h.setDateTo}
            searchQuery={h.searchQuery} onSearchChange={h.setSearchQuery}
            hasActiveFilters={h.hasActiveFilters} activeFilterCount={h.activeFilterCount}
            onClearFilters={h.clearFilters}
            isMobile={isMobile}
            filtersExpanded={h.filtersExpanded} onFiltersExpandedChange={h.setFiltersExpanded}
          />

          {h.hasActiveFilters && (
            <div className="text-xs text-muted-foreground">
              Mostrando {h.filteredLogs.length} de {h.logs?.length || 0} registros
            </div>
          )}

          {/* Batch Selection */}
          {h.filteredLogs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border/30">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={h.selectedIds.size === h.filteredLogs.length && h.filteredLogs.length > 0}
                    onChange={h.toggleSelectAll}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    {h.selectedIds.size === h.filteredLogs.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </span>
                </label>
                {h.selectedIds.size > 0 && (
                  <span className="text-xs sm:text-sm text-muted-foreground">{h.selectedIds.size} selecionado(s)</span>
                )}
              </div>
              {h.selectedIds.size > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="ghost" size="sm" onClick={h.clearSelection} className="flex-1 sm:flex-none h-8 text-xs sm:text-sm">Limpar</Button>
                  <Button variant="destructive" size="sm" onClick={() => h.setBatchDeleteDialogOpen(true)} className="flex-1 sm:flex-none h-8 text-xs sm:text-sm">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir {h.selectedIds.size}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!h.logs || h.logs.length === 0 ? (
          <EmptyState icon={History} title="Nenhum envio realizado ainda" description="Os envios aparecerão aqui" compact />
        ) : h.filteredLogs.length === 0 ? (
          <EmptyState icon={Filter} title="Nenhum registro encontrado" description="Tente ajustar os filtros" compact
            action={<Button variant="link" size="sm" onClick={h.clearFilters}>Limpar filtros</Button>}
          />
        ) : (
          <div className="space-y-3">
            {h.filteredLogs.map((log) => (
              <BroadcastHistoryLogItem
                key={log.id}
                log={log}
                isExpanded={h.expandedId === log.id}
                isSelected={h.selectedIds.has(log.id)}
                onToggleExpand={() => h.setExpandedId(h.expandedId === log.id ? null : log.id)}
                onToggleSelect={() => h.toggleSelection(log.id)}
                onDelete={(e) => { e.stopPropagation(); h.handleDeleteClick(log); }}
                onResend={onResend}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={h.deleteDialogOpen} onOpenChange={h.setDeleteDialogOpen}
        title="Excluir registro"
        description={<>
          Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita.
          {h.logToDelete && (
            <span className="block mt-2 text-sm">
              <strong>Tipo:</strong> {getMessageTypeLabel(h.logToDelete.message_type)} •
              <strong> Grupos:</strong> {h.logToDelete.groups_targeted} •
              <strong> Data:</strong> {formatBR(h.logToDelete.created_at, "dd/MM/yyyy")}
            </span>
          )}
        </>}
        onConfirm={h.confirmDelete} isLoading={h.deleteMutation.isPending} confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={h.batchDeleteDialogOpen} onOpenChange={h.setBatchDeleteDialogOpen}
        title={`Excluir ${h.selectedIds.size} registros`}
        description={<>Tem certeza que deseja excluir <strong>{h.selectedIds.size} registros</strong> do histórico? Esta ação não pode ser desfeita.</>}
        onConfirm={h.confirmBatchDelete} isLoading={h.batchDeleteMutation.isPending}
        confirmLabel={`Excluir ${h.selectedIds.size} registros`}
      />
    </Card>
  );
};

export default BroadcastHistory;
