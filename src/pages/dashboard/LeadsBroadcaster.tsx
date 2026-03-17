import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Server, Users } from 'lucide-react';
import InstanceSelector from '@/components/broadcast/InstanceSelector';
import BroadcasterHeader from '@/components/broadcast/BroadcasterHeader';
import LeadImporter from '@/components/broadcast/LeadImporter';
import LeadMessageForm from '@/components/broadcast/LeadMessageForm';
import LeadDatabasePicker from '@/components/broadcast/LeadDatabasePicker';
import LeadContactsCard from '@/components/broadcast/LeadContactsCard';
import LeadsSummaryCard from '@/components/broadcast/LeadsSummaryCard';
import ResendBanner from '@/components/broadcast/ResendBanner';
import WizardSteps from '@/components/broadcast/WizardSteps';
import EditDatabaseDialog from '@/components/broadcast/EditDatabaseDialog';
import ManageLeadDatabaseDialog from '@/components/broadcast/ManageLeadDatabaseDialog';
import { useLeadsBroadcaster } from '@/hooks/useLeadsBroadcaster';

const LeadsBroadcaster = () => {
  const h = useLeadsBroadcaster();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disparador de Leads</h1>
          <p className="text-muted-foreground">Envie mensagens para contatos individuais</p>
        </div>
        {h.step !== 'instance' && (
          <Button variant="ghost" size="sm" onClick={h.handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        )}
      </div>

      {/* Resend Banner */}
      {h.resendData && <ResendBanner resendData={h.resendData} onCancel={() => h.setResendData(null)} />}

      {/* Progress Steps */}
      <WizardSteps step={h.step} hasInstance={!!h.selectedInstance} leadsCount={h.leads.length} />

      {/* Step 1: Instance Selection */}
      {h.step === 'instance' && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5" /> Selecionar Instância
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InstanceSelector selectedInstance={h.selectedInstance} onSelect={h.handleInstanceSelect} />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Combined Base + Contacts */}
      {h.step === 'contacts' && h.selectedInstance && (
        <div className="space-y-4">
          <BroadcasterHeader
            instance={h.selectedInstance}
            database={h.selectedDatabases}
            onChangeInstance={h.handleChangeInstance}
            showDatabase={false}
          />

          <LeadDatabasePicker
            databases={h.databases}
            selectedDatabases={h.selectedDatabases}
            isLoading={h.isLoadingDatabases}
            isCreatingNew={h.isCreatingNewDatabase}
            newDatabaseName={h.newDatabaseName}
            setNewDatabaseName={h.setNewDatabaseName}
            canSaveDatabase={h.canSaveDatabase}
            isSavingDatabase={h.isSavingDatabase}
            hasUnsavedChanges={h.hasUnsavedChanges}
            onToggleDatabase={h.handleToggleDatabase}
            onStartNewDatabase={h.handleStartNewDatabase}
            onSaveDatabase={h.handleSaveDatabase}
            onUpdateDatabase={h.handleUpdateDatabase}
            onManage={db => h.setManageTarget(db)}
          />

          {/* Import Section */}
          {!h.isLoadingLeads && (h.selectedDatabases.length > 0 || h.isCreatingNewDatabase) && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" /> Importar Contatos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LeadImporter instance={h.selectedInstance} onLeadsImported={h.handleLeadsImported} />
              </CardContent>
            </Card>
          )}

          <LeadContactsCard
            leads={h.leads}
            selectedLeads={h.selectedLeads}
            onSelectionChange={h.setSelectedLeads}
            isVerifying={h.isVerifying}
            verificationProgress={h.verificationProgress}
            hasVerifiedLeads={h.hasVerifiedLeads}
            validLeadsCount={h.validLeadsCount}
            invalidLeadsCount={h.invalidLeadsCount}
            onVerifyNumbers={h.handleVerifyNumbers}
            onClearLeads={h.handleClearLeads}
            onRemoveInvalid={h.handleRemoveInvalid}
            onSelectOnlyValid={h.handleSelectOnlyValid}
            onContinue={h.handleContinueToMessage}
          />
        </div>
      )}

      {/* Step 3: Message Composition */}
      {h.step === 'message' && h.selectedInstance && h.selectedLeadsList.length > 0 && (
        <div className="space-y-4">
          <BroadcasterHeader
            instance={h.selectedInstance}
            database={h.selectedDatabases}
            onChangeInstance={h.handleChangeInstance}
            onChangeDatabase={() => h.setStep('contacts')}
          />

          <LeadsSummaryCard
            selectedLeads={h.selectedLeadsList}
            onChangeSelection={() => h.setStep('contacts')}
          />

          <LeadMessageForm
            instance={h.selectedInstance}
            selectedLeads={h.selectedLeadsList}
            onComplete={h.handleComplete}
            initialData={h.resendData ? {
              messageType: h.resendData.messageType,
              content: h.resendData.content,
              mediaUrl: h.resendData.mediaUrl,
              carouselData: h.resendData.carouselData,
            } : undefined}
          />
        </div>
      )}

      {/* Dialogs */}
      <EditDatabaseDialog
        open={!!h.editTarget}
        onOpenChange={(open) => !open && h.setEditTarget(null)}
        database={h.editTarget}
        onSave={h.handleDatabaseUpdated}
      />
      <ManageLeadDatabaseDialog
        open={!!h.manageTarget}
        onOpenChange={(open) => !open && h.setManageTarget(null)}
        database={h.manageTarget}
        onDatabaseUpdated={(updated) => { h.handleDatabaseUpdated(updated); h.setManageTarget(updated); }}
      />
    </div>
  );
};

export default LeadsBroadcaster;
