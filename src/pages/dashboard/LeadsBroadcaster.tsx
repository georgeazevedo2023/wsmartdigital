import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, Users, MessageSquare, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import InstanceSelector, { Instance } from '@/components/broadcast/InstanceSelector';
import LeadImporter from '@/components/broadcast/LeadImporter';
import LeadList from '@/components/broadcast/LeadList';
import LeadMessageForm from '@/components/broadcast/LeadMessageForm';

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  jid: string;
  source: 'manual' | 'paste' | 'group';
  groupName?: string;
}

const LeadsBroadcaster = () => {
  const [step, setStep] = useState<'instance' | 'import' | 'message'>('instance');
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const handleInstanceSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    setStep('import');
  };

  const handleLeadsImported = (importedLeads: Lead[]) => {
    // Deduplicate by phone number
    const existingPhones = new Set(leads.map(l => l.phone));
    const newLeads = importedLeads.filter(l => !existingPhones.has(l.phone));
    
    const allLeads = [...leads, ...newLeads];
    setLeads(allLeads);
    
    // Auto-select all new leads
    const allIds = new Set([...selectedLeads, ...newLeads.map(l => l.id)]);
    setSelectedLeads(allIds);
  };

  const handleContinueToMessage = () => {
    setStep('message');
  };

  const handleComplete = () => {
    setLeads([]);
    setSelectedLeads(new Set());
    setStep('instance');
    setSelectedInstance(null);
  };

  const handleBack = () => {
    if (step === 'message') {
      setStep('import');
    } else if (step === 'import') {
      setStep('instance');
      setSelectedInstance(null);
      setLeads([]);
      setSelectedLeads(new Set());
    }
  };

  const handleClearLeads = () => {
    setLeads([]);
    setSelectedLeads(new Set());
  };

  const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disparador de Leads</h1>
          <p className="text-muted-foreground">
            Envie mensagens para contatos individuais
          </p>
        </div>
        
        {step !== 'instance' && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`flex items-center gap-2 ${selectedInstance ? 'text-primary' : 'text-muted-foreground'}`}>
          {selectedInstance ? (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">1</div>
          )}
          <span className="font-medium">Instância</span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        
        <div className={`flex items-center gap-2 ${step === 'message' ? 'text-primary' : step === 'import' ? 'text-foreground' : 'text-muted-foreground'}`}>
          {step === 'message' ? (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          ) : (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'import' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>2</div>
          )}
          <span className="font-medium">Importar Contatos</span>
          {leads.length > 0 && (
            <Badge variant="secondary" className="text-xs">{leads.length}</Badge>
          )}
        </div>
        
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
        
        <div className={`flex items-center gap-2 ${step === 'message' ? 'text-foreground' : 'text-muted-foreground'}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'message' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>3</div>
          <span className="font-medium">Mensagem</span>
        </div>
      </div>

      {/* Step 1: Instance Selection */}
      {step === 'instance' && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="w-5 h-5" />
              Selecionar Instância
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InstanceSelector
              selectedInstance={selectedInstance}
              onSelect={handleInstanceSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Selected Instance Badge */}
      {step !== 'instance' && selectedInstance && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{selectedInstance.name}</p>
            <p className="text-xs text-muted-foreground">Instância selecionada</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedInstance(null); setStep('instance'); setLeads([]); setSelectedLeads(new Set()); }}>
            Trocar
          </Button>
        </div>
      )}

      {/* Step 2: Import Contacts */}
      {step === 'import' && selectedInstance && (
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Importar Contatos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadImporter
                instance={selectedInstance}
                onLeadsImported={handleLeadsImported}
              />
            </CardContent>
          </Card>

          {leads.length > 0 && (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Contatos Importados
                    <Badge variant="secondary">{leads.length}</Badge>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleClearLeads}>
                    Limpar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <LeadList
                  leads={leads}
                  selectedLeads={selectedLeads}
                  onSelectionChange={setSelectedLeads}
                />
                
                {selectedLeads.size > 0 && (
                  <div className="flex justify-end pt-2 border-t">
                    <Button onClick={handleContinueToMessage}>
                      Continuar com {selectedLeads.size} contato{selectedLeads.size !== 1 ? 's' : ''}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Message Composition */}
      {step === 'message' && selectedInstance && selectedLeadsList.length > 0 && (
        <div className="space-y-4">
          {/* Selected Leads Summary */}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedLeadsList.length} contato{selectedLeadsList.length !== 1 ? 's' : ''} selecionado{selectedLeadsList.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Envio individual para cada número
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('import')}>
                  Alterar seleção
                </Button>
              </div>
              
              {/* Lead names preview */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedLeadsList.slice(0, 5).map((lead) => (
                  <Badge key={lead.id} variant="secondary" className="text-xs">
                    {lead.name || lead.phone}
                  </Badge>
                ))}
                {selectedLeadsList.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedLeadsList.length - 5} mais
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Form */}
          <LeadMessageForm
            instance={selectedInstance}
            selectedLeads={selectedLeadsList}
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
};

export default LeadsBroadcaster;
