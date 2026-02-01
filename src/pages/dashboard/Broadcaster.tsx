import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Server, Users, MessageSquare, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import InstanceSelector, { Instance } from '@/components/broadcast/InstanceSelector';
import GroupSelector, { Group } from '@/components/broadcast/GroupSelector';
import BroadcastMessageForm from '@/components/broadcast/BroadcastMessageForm';

// Interface matching the BroadcastLog from history
interface ResendData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  instanceId: string;
  instanceName: string | null;
}

const Broadcaster = () => {
  const [step, setStep] = useState<'instance' | 'groups' | 'message'>('instance');
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  const [resendData, setResendData] = useState<ResendData | null>(null);

  // Check for resend data from history page
  useEffect(() => {
    const storedData = sessionStorage.getItem('resendData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setResendData(parsed);
        sessionStorage.removeItem('resendData');
        toast.info('Selecione a instância e os grupos para reenviar a mensagem', {
          duration: 4000,
        });
      } catch (e) {
        console.error('Failed to parse resend data:', e);
        sessionStorage.removeItem('resendData');
      }
    }
  }, []);

  const handleInstanceSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    setSelectedGroups([]);
    setStep('groups');
  };

  const handleComplete = () => {
    setSelectedGroups([]);
    setStep('instance');
    setSelectedInstance(null);
    setResendData(null);
  };

  const handleBack = () => {
    if (step === 'message') {
      setStep('groups');
    } else if (step === 'groups') {
      setStep('instance');
      setSelectedInstance(null);
      setSelectedGroups([]);
      setResendData(null);
    }
  };

  const handleContinueToMessage = () => {
    setStep('message');
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Disparador</h1>
          <p className="text-muted-foreground">
            Envie mensagens para múltiplos grupos de uma vez
          </p>
        </div>
        
        {step !== 'instance' && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      {/* Resend Banner */}
      {resendData && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Reenviando mensagem</span>
              <Badge variant="secondary" className="text-xs">
                {resendData.messageType === 'text' ? 'Texto' : 
                 resendData.messageType === 'image' ? 'Imagem' :
                 resendData.messageType === 'video' ? 'Vídeo' :
                 resendData.messageType === 'audio' || resendData.messageType === 'ptt' ? 'Áudio' : 'Documento'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResendData(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
          </div>
          {resendData.content && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              "{resendData.content}"
            </p>
          )}
        </div>
      )}

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
        
        <div className={`flex items-center gap-2 ${step === 'message' ? 'text-primary' : step === 'groups' ? 'text-foreground' : 'text-muted-foreground'}`}>
          {step === 'message' ? (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-4 h-4 text-primary-foreground" />
            </div>
          ) : (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step === 'groups' ? 'bg-primary/20 text-primary' : 'bg-muted'}`}>2</div>
          )}
          <span className="font-medium">Grupos</span>
          {selectedGroups.length > 0 && (
            <Badge variant="secondary" className="text-xs">{selectedGroups.length}</Badge>
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
          <Button variant="ghost" size="sm" onClick={() => { setSelectedInstance(null); setStep('instance'); setSelectedGroups([]); }}>
            Trocar
          </Button>
        </div>
      )}

      {/* Step 2: Group Selection */}
      {step === 'groups' && selectedInstance && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Selecionar Grupos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GroupSelector
              instance={selectedInstance}
              selectedGroups={selectedGroups}
              onSelectionChange={setSelectedGroups}
            />
            
            {selectedGroups.length > 0 && (
              <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleContinueToMessage}>
                  Continuar com {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Message Composition */}
      {step === 'message' && selectedInstance && selectedGroups.length > 0 && (
        <div className="space-y-4">
          {/* Selected Groups Summary */}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''} selecionado{selectedGroups.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedGroups.reduce((acc, g) => acc + g.size, 0)} membros no total
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('groups')}>
                  Alterar seleção
                </Button>
              </div>
              
              {/* Group names preview */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedGroups.slice(0, 5).map((group) => (
                  <Badge key={group.id} variant="secondary" className="text-xs">
                    {group.name}
                  </Badge>
                ))}
                {selectedGroups.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedGroups.length - 5} mais
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Form */}
          <BroadcastMessageForm
            instance={selectedInstance}
            selectedGroups={selectedGroups}
            onComplete={handleComplete}
            initialData={resendData ? {
              messageType: resendData.messageType,
              content: resendData.content,
              mediaUrl: resendData.mediaUrl,
            } : undefined}
          />
        </div>
      )}

    </div>
  );
};

export default Broadcaster;