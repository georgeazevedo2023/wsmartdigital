import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, Users, MessageSquare, ChevronRight, Check, ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import InstanceSelector, { Instance } from '@/components/broadcast/InstanceSelector';
import LeadImporter from '@/components/broadcast/LeadImporter';
import LeadList from '@/components/broadcast/LeadList';
import LeadMessageForm from '@/components/broadcast/LeadMessageForm';
import { supabase } from '@/integrations/supabase/client';

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  jid: string;
  source: 'manual' | 'paste' | 'group';
  groupName?: string;
  // Verification fields
  isVerified?: boolean;
  verifiedName?: string;
  verificationStatus?: 'pending' | 'valid' | 'invalid' | 'error';
}

const LeadsBroadcaster = () => {
  const [step, setStep] = useState<'instance' | 'import' | 'message'>('instance');
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

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

  const handleVerifyNumbers = async () => {
    if (!selectedInstance || leads.length === 0) return;
    
    setIsVerifying(true);
    setVerificationProgress(0);
    
    try {
      // Extract phone numbers (without @s.whatsapp.net)
      const phones = leads.map(l => l.jid.replace('@s.whatsapp.net', ''));
      
      // Verify in batches of 50 to avoid timeouts
      const BATCH_SIZE = 50;
      const results = new Map<string, { isValid: boolean; verifiedName?: string }>();
      
      for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const batch = phones.slice(i, i + BATCH_SIZE);
        
        const response = await supabase.functions.invoke('uazapi-proxy', {
          body: {
            action: 'check-numbers',
            token: selectedInstance.token,
            phones: batch,
          },
        });
        
        if (response.error) {
          console.error('Verification error:', response.error);
          toast.error('Erro ao verificar números');
          break;
        }
        
        if (response.data?.users && Array.isArray(response.data.users)) {
          response.data.users.forEach((u: { Query?: string; query?: string; IsInWhatsapp?: boolean; isInWhatsapp?: boolean; VerifiedName?: string; verifiedName?: string }) => {
            const query = u.Query || u.query || '';
            results.set(query, {
              isValid: u.IsInWhatsapp || u.isInWhatsapp || false,
              verifiedName: u.VerifiedName || u.verifiedName || '',
            });
          });
        }
        
        setVerificationProgress(Math.min(100, ((i + batch.length) / phones.length) * 100));
      }
      
      // Update leads with verification status
      setLeads(prevLeads => prevLeads.map(lead => {
        const phone = lead.jid.replace('@s.whatsapp.net', '');
        const result = results.get(phone);
        return {
          ...lead,
          verificationStatus: result ? (result.isValid ? 'valid' : 'invalid') : 'error',
          isVerified: result?.isValid ?? false,
          verifiedName: result?.verifiedName,
        };
      }));
      
      const validCount = Array.from(results.values()).filter(r => r.isValid).length;
      const invalidCount = Array.from(results.values()).filter(r => !r.isValid).length;
      
      toast.success(`Verificação concluída: ${validCount} válidos, ${invalidCount} inválidos`);
      
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Erro ao verificar números');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveInvalid = () => {
    const validLeads = leads.filter(l => l.verificationStatus !== 'invalid');
    const removedCount = leads.length - validLeads.length;
    
    // Update leads
    setLeads(validLeads);
    
    // Update selection to remove invalid leads
    const validIds = new Set(validLeads.map(l => l.id));
    const newSelection = new Set([...selectedLeads].filter(id => validIds.has(id)));
    setSelectedLeads(newSelection);
    
    toast.success(`${removedCount} contato${removedCount !== 1 ? 's' : ''} inválido${removedCount !== 1 ? 's' : ''} removido${removedCount !== 1 ? 's' : ''}`);
  };

  const handleSelectOnlyValid = () => {
    const validIds = new Set(
      leads
        .filter(l => l.verificationStatus === 'valid')
        .map(l => l.id)
    );
    setSelectedLeads(validIds);
    toast.success(`${validIds.size} contatos válidos selecionados`);
  };

  const handleRemoveInvalidAndSelect = () => {
    handleRemoveInvalid();
    // After removing, select all remaining (which are valid or not verified)
    setTimeout(() => {
      const remainingIds = new Set(leads.filter(l => l.verificationStatus !== 'invalid').map(l => l.id));
      setSelectedLeads(remainingIds);
    }, 0);
  };

  const hasVerifiedLeads = leads.some(l => l.verificationStatus);
  const validLeadsCount = leads.filter(l => l.verificationStatus === 'valid').length;
  const invalidLeadsCount = leads.filter(l => l.verificationStatus === 'invalid').length;

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
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleVerifyNumbers}
                      disabled={isVerifying || leads.length === 0}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verificando... {Math.round(verificationProgress)}%
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Verificar Números
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearLeads}>
                      Limpar
                    </Button>
                  </div>
                </div>
                
                {/* Verification summary */}
                {hasVerifiedLeads && (
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
                    <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30 hover:bg-green-500/20">
                      {validLeadsCount} válidos
                    </Badge>
                    <Badge variant="destructive" className="bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/20">
                      {invalidLeadsCount} inválidos
                    </Badge>
                    <div className="flex gap-2 ml-auto">
                      {invalidLeadsCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleRemoveInvalid} className="text-xs h-7 text-destructive hover:text-destructive">
                          Remover inválidos
                        </Button>
                      )}
                      {validLeadsCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={handleSelectOnlyValid} className="text-xs h-7">
                          Selecionar válidos
                        </Button>
                      )}
                    </div>
                  </div>
                )}
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
