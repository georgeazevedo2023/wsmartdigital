import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Send, Users, MessageSquare, Image, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ScheduleMessageDialog, ScheduleConfig } from '@/components/group/ScheduleMessageDialog';
import type { Instance } from './InstanceSelector';
import type { Group } from './GroupSelector';

interface BroadcastMessageFormProps {
  instance: Instance;
  selectedGroups: Group[];
  onComplete?: () => void;
}

interface SendProgress {
  currentGroup: number;
  totalGroups: number;
  currentMember: number;
  totalMembers: number;
  groupName: string;
  status: 'idle' | 'sending' | 'success' | 'error';
  results: { groupName: string; success: boolean; error?: string }[];
}

const MAX_MESSAGE_LENGTH = 4096;
const SEND_DELAY_MS = 350;
const GROUP_DELAY_MS = 500;

const BroadcastMessageForm = ({ instance, selectedGroups, onComplete }: BroadcastMessageFormProps) => {
  const [message, setMessage] = useState('');
  const [excludeAdmins, setExcludeAdmins] = useState(false);
  const [progress, setProgress] = useState<SendProgress>({
    currentGroup: 0,
    totalGroups: 0,
    currentMember: 0,
    totalMembers: 0,
    groupName: '',
    status: 'idle',
    results: [],
  });
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const totalMembers = selectedGroups.reduce((acc, g) => acc + g.size, 0);
  const totalRegularMembers = selectedGroups.reduce((acc, g) => {
    return acc + g.participants.filter(p => !p.isAdmin && !p.isSuperAdmin).length;
  }, 0);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const sendToNumber = async (number: string, text: string, accessToken: string) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'send-message',
          token: instance.token,
          groupjid: number,
          message: text,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Erro ao enviar');
    }

    return response.json();
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Mensagem muito longa (máximo ${MAX_MESSAGE_LENGTH} caracteres)`);
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    setProgress({
      currentGroup: 0,
      totalGroups: selectedGroups.length,
      currentMember: 0,
      totalMembers: 0,
      groupName: '',
      status: 'sending',
      results: [],
    });

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        setProgress(p => ({ ...p, status: 'error' }));
        return;
      }

      const accessToken = session.data.session.access_token;
      const results: SendProgress['results'] = [];

      for (let i = 0; i < selectedGroups.length; i++) {
        const group = selectedGroups[i];
        
        try {
          if (excludeAdmins) {
            const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
            
            setProgress(p => ({
              ...p,
              currentGroup: i + 1,
              groupName: group.name,
              currentMember: 0,
              totalMembers: regularMembers.length,
            }));

            for (let j = 0; j < regularMembers.length; j++) {
              try {
                await sendToNumber(regularMembers[j].jid, trimmedMessage, accessToken);
              } catch (err) {
                console.error(`Erro ao enviar para ${regularMembers[j].jid}:`, err);
              }
              
              setProgress(p => ({ ...p, currentMember: j + 1 }));
              
              if (j < regularMembers.length - 1) {
                await delay(SEND_DELAY_MS);
              }
            }
          } else {
            setProgress(p => ({
              ...p,
              currentGroup: i + 1,
              groupName: group.name,
              currentMember: 0,
              totalMembers: 1,
            }));

            await sendToNumber(group.id, trimmedMessage, accessToken);
            setProgress(p => ({ ...p, currentMember: 1 }));
          }

          results.push({ groupName: group.name, success: true });
        } catch (error) {
          console.error(`Erro ao enviar para grupo ${group.name}:`, error);
          results.push({ 
            groupName: group.name, 
            success: false, 
            error: error instanceof Error ? error.message : 'Erro desconhecido' 
          });
        }

        // Delay between groups
        if (i < selectedGroups.length - 1) {
          await delay(GROUP_DELAY_MS);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      setProgress(p => ({ ...p, status: 'success', results }));

      if (failCount > 0) {
        toast.warning(`Enviado para ${successCount} grupo(s). ${failCount} falha(s).`);
      } else {
        toast.success(`Mensagem enviada para ${successCount} grupo(s)!`);
      }

      setMessage('');
      onComplete?.();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Erro ao enviar mensagens');
      setProgress(p => ({ ...p, status: 'error' }));
    }
  };

  const handleSchedule = async (config: ScheduleConfig) => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (selectedGroups.length === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    setIsScheduling(true);

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        toast.error('Sessão expirada');
        return;
      }

      // Criar um agendamento para cada grupo selecionado
      const insertPromises = selectedGroups.map(group => {
        const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
        const recipients = excludeAdmins && regularMembers.length > 0
          ? regularMembers.map(m => ({ jid: m.jid }))
          : null;

        return supabase.from('scheduled_messages').insert({
          user_id: session.data.session!.user.id,
          instance_id: instance.id,
          group_jid: group.id,
          group_name: group.name,
          exclude_admins: excludeAdmins,
          recipients,
          message_type: 'text',
          content: trimmedMessage,
          scheduled_at: config.scheduledAt.toISOString(),
          next_run_at: config.scheduledAt.toISOString(),
          is_recurring: config.isRecurring,
          recurrence_type: config.isRecurring ? config.recurrenceType : null,
          recurrence_interval: config.recurrenceInterval,
          recurrence_days: config.recurrenceDays.length > 0 ? config.recurrenceDays : null,
          recurrence_end_at: config.recurrenceEndAt?.toISOString() || null,
          recurrence_count: config.recurrenceCount || null,
          status: 'pending',
        });
      });

      const results = await Promise.all(insertPromises);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw new Error(`Falha ao agendar ${errors.length} grupo(s)`);
      }

      toast.success(`${selectedGroups.length} agendamento(s) criado(s)!`);
      setMessage('');
      setShowScheduleDialog(false);
      onComplete?.();
    } catch (error) {
      console.error('Error scheduling broadcast:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao agendar');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCloseProgress = () => {
    setProgress(p => ({ ...p, status: 'idle', results: [] }));
  };

  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const isSending = progress.status === 'sending';

  const targetCount = excludeAdmins ? totalRegularMembers : selectedGroups.length;

  return (
    <>
      {/* Progress Modal */}
      {progress.status !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                {progress.status === 'sending' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando mensagens...
                  </>
                )}
                {progress.status === 'success' && (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    Envio concluído
                  </>
                )}
                {progress.status === 'error' && (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    Erro no envio
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {progress.status === 'sending' && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Grupo {progress.currentGroup} de {progress.totalGroups}</span>
                      <span className="text-muted-foreground truncate ml-2">{progress.groupName}</span>
                    </div>
                    <Progress value={(progress.currentGroup / progress.totalGroups) * 100} />
                  </div>

                  {excludeAdmins && progress.totalMembers > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Membros</span>
                        <span>{progress.currentMember} / {progress.totalMembers}</span>
                      </div>
                      <Progress 
                        value={(progress.currentMember / progress.totalMembers) * 100} 
                        className="h-1"
                      />
                    </div>
                  )}
                </>
              )}

              {progress.status !== 'sending' && progress.results.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {progress.results.map((result, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <span className="truncate">{result.groupName}</span>
                    </div>
                  ))}
                </div>
              )}

              {progress.status !== 'sending' && (
                <Button onClick={handleCloseProgress} className="w-full">
                  Fechar
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Compor Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2" disabled>
                <Image className="w-4 h-4" />
                Mídia (em breve)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="space-y-4">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
                className="min-h-[120px] resize-none"
                maxLength={MAX_MESSAGE_LENGTH + 100}
              />
              
              <div className="flex items-center justify-between">
                <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {characterCount.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()} caracteres
                </span>
              </div>

              {/* Toggle para excluir admins */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label htmlFor="exclude-admins-broadcast" className="text-sm font-medium cursor-pointer">
                      Não enviar para Admins/Donos
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {excludeAdmins 
                        ? `Enviará para ${totalRegularMembers} membro${totalRegularMembers !== 1 ? 's' : ''} (não-admins)`
                        : `Enviará para ${selectedGroups.length} grupo${selectedGroups.length !== 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                <Switch
                  id="exclude-admins-broadcast"
                  checked={excludeAdmins}
                  onCheckedChange={setExcludeAdmins}
                  disabled={isSending}
                />
              </div>

              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="w-3 h-3" />
                  {excludeAdmins ? totalRegularMembers : totalMembers} destinatário{(excludeAdmins ? totalRegularMembers : totalMembers) !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleDialog(true)}
                  disabled={isSending || !message.trim() || isOverLimit || selectedGroups.length === 0}
                  size="sm"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Agendar
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={isSending || !message.trim() || isOverLimit || selectedGroups.length === 0 || (excludeAdmins && totalRegularMembers === 0)}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para {targetCount}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onConfirm={handleSchedule}
        isLoading={isScheduling}
      />
    </>
  );
};

export default BroadcastMessageForm;
