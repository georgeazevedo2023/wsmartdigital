import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Trash2, Send, Loader2, CheckCircle2 } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, '0')}:00`,
}));

interface ShiftConfig {
  id: string;
  inbox_id: string;
  instance_id: string;
  recipient_number: string;
  send_hour: number;
  enabled: boolean;
  last_sent_at: string | null;
  inbox_name?: string;
  instance_name?: string;
}

interface NewConfigForm {
  inbox_id: string;
  instance_id: string;
  recipient_number: string;
  send_hour: string;
}

const ShiftReportSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; report?: string } | null>(null);
  const [form, setForm] = useState<NewConfigForm>({
    inbox_id: '',
    instance_id: '',
    recipient_number: '',
    send_hour: '18',
  });

  const { data: inboxes } = useQuery({
    queryKey: ['inboxes-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inboxes').select('id, name, instance_id').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: instances } = useQuery({
    queryKey: ['instances-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instances').select('id, name, status').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ['shift-report-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_report_configs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const enriched: ShiftConfig[] = (data || []).map((c: any) => ({
        ...c,
        inbox_name: inboxes?.find((i) => i.id === c.inbox_id)?.name,
        instance_name: instances?.find((i) => i.id === c.instance_id)?.name,
      }));
      return enriched;
    },
    enabled: !!inboxes && !!instances,
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewConfigForm) => {
      const { error } = await supabase.from('shift_report_configs').insert({
        inbox_id: data.inbox_id,
        instance_id: data.instance_id,
        recipient_number: data.recipient_number,
        send_hour: parseInt(data.send_hour),
        created_by: user!.id,
        enabled: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-report-configs'] });
      setShowForm(false);
      setForm({ inbox_id: '', instance_id: '', recipient_number: '', send_hour: '18' });
      toast.success('Relatório de turno configurado com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar configuração: ' + err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('shift_report_configs').update({ enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-report-configs'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shift_report_configs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-report-configs'] });
      toast.success('Configuração removida.');
    },
  });

  const handleTestSend = async (configId: string, testMode: boolean) => {
    setTestingId(configId);
    setTestResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada.');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-shift-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ config_id: configId, test_mode: testMode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Erro ao enviar relatório.');
        setTestResult({ id: configId, success: false });
        return;
      }

      if (testMode) {
        setTestResult({ id: configId, success: true, report: data.report });
        toast.success('Prévia gerada com sucesso!');
      } else {
        setTestResult({ id: configId, success: data.success });
        if (data.success) {
          toast.success('Relatório enviado via WhatsApp!');
          queryClient.invalidateQueries({ queryKey: ['shift-report-configs'] });
        } else {
          toast.error(data.error || 'Falha ao enviar pelo WhatsApp. Verifique se a instância está conectada.');
        }
      }
    } catch {
      toast.error('Erro inesperado.');
      setTestResult({ id: configId, success: false });
    } finally {
      setTestingId(null);
    }
  };

  const handleInboxChange = (inboxId: string) => {
    const inbox = inboxes?.find((i) => i.id === inboxId);
    setForm((f) => ({
      ...f,
      inbox_id: inboxId,
      instance_id: inbox?.instance_id || f.instance_id,
    }));
  };

  return (
    <Card className="glass-card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Relatório de Turno Automático
            </CardTitle>
            <CardDescription className="mt-1">
              Envie um resumo diário de atendimentos via WhatsApp para o gestor no horário configurado
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-4">
            <p className="text-sm font-semibold text-foreground">Nova configuração</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Caixa de atendimento</Label>
                <Select value={form.inbox_id} onValueChange={handleInboxChange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecionar caixa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(inboxes || []).map((inbox) => (
                      <SelectItem key={inbox.id} value={inbox.id}>{inbox.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Instância para envio</Label>
                <Select value={form.instance_id} onValueChange={(v) => setForm((f) => ({ ...f, instance_id: v }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecionar instância..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(instances || []).map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${inst.status === 'connected' ? 'bg-primary' : 'bg-muted-foreground'}`} />
                          {inst.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">WhatsApp do gestor</Label>
                <Input
                  placeholder="5511999999999"
                  value={form.recipient_number}
                  onChange={(e) => setForm((f) => ({ ...f, recipient_number: e.target.value }))}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">DDI + DDD + número (sem espaços ou traços)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Horário de envio (São Paulo)</Label>
                <Select value={form.send_hour} onValueChange={(v) => setForm((f) => ({ ...f, send_hour: v }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                size="sm"
                disabled={!form.inbox_id || !form.instance_id || !form.recipient_number || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Salvar configuração
              </Button>
            </div>
          </div>
        )}

        {configsLoading && (
          <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>
        )}

        {!configsLoading && (!configs || configs.length === 0) && !showForm && (
          <div className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
            Nenhum relatório de turno configurado ainda.
            <br />
            Clique em <strong>Novo</strong> para configurar.
          </div>
        )}

        {(configs || []).map((config) => (
          <div key={config.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">
                    {config.inbox_name || config.inbox_id}
                  </p>
                  <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-xs">
                    {config.enabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span>📱 {config.recipient_number}</span>
                  <span>🕐 {String(config.send_hour).padStart(2, '0')}:00 (SP)</span>
                  <span>📡 {config.instance_name || config.instance_id}</span>
                </div>
                {config.last_sent_at && (
                  <p className="text-xs text-muted-foreground">
                    Último envio: {new Date(config.last_sent_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: config.id, enabled: v })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-8 w-8"
                  onClick={() => deleteMutation.mutate(config.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {testResult?.id === config.id && testResult.report && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Prévia do relatório</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{testResult.report}</pre>
              </div>
            )}

            <div className="flex gap-2 pt-1 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleTestSend(config.id, true)}
                disabled={testingId === config.id}
              >
                {testingId === config.id ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                )}
                Ver prévia
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 text-primary border-primary/30 hover:bg-primary/10"
                onClick={() => handleTestSend(config.id, false)}
                disabled={testingId === config.id}
              >
                {testingId === config.id ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Send className="w-3 h-3 mr-1" />
                )}
                Enviar agora
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ShiftReportSection;
