import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Code,
  Shield,
  HardDrive,
  Table2,
  Users,
  Plug,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface MigrationStep {
  id: string;
  action: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
  result?: { success: number; failed: number; errors: string[]; tableResults?: { table: string; rows: number }[] };
}

const MigrationWizard = () => {
  // Credentials (local state only, never persisted)
  const [externalUrl, setExternalUrl] = useState('');
  const [externalServiceRole, setExternalServiceRole] = useState('');
  const [externalDbUrl, setExternalDbUrl] = useState('');
  const [showServiceRole, setShowServiceRole] = useState(false);
  const [showDbUrl, setShowDbUrl] = useState(false);

  // Connection
  const [connectionTested, setConnectionTested] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  // Auth users
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [showAuthUsers, setShowAuthUsers] = useState(false);

  // Steps
  const [steps, setSteps] = useState<MigrationStep[]>([
    { id: 'schema', action: 'migrate-schema', label: 'Schema', description: 'ENUMs, Tabelas, FKs, Indexes', icon: <Database className="w-5 h-5" />, status: 'pending' },
    { id: 'functions', action: 'migrate-functions', label: 'Funções', description: 'Functions + indexes dependentes', icon: <Code className="w-5 h-5" />, status: 'pending' },
    { id: 'rls', action: 'migrate-rls', label: 'RLS & Policies', description: 'Enable RLS + Create Policies', icon: <Shield className="w-5 h-5" />, status: 'pending' },
    { id: 'triggers', action: 'migrate-triggers', label: 'Triggers', description: 'Triggers de automação', icon: <ArrowRight className="w-5 h-5" />, status: 'pending' },
    { id: 'storage', action: 'migrate-storage', label: 'Storage', description: 'Buckets + políticas de storage', icon: <HardDrive className="w-5 h-5" />, status: 'pending' },
    { id: 'data', action: 'migrate-data', label: 'Dados', description: 'Dados filtrados (exceto alto volume)', icon: <Table2 className="w-5 h-5" />, status: 'pending' },
    { id: 'auth', action: 'get-auth-users', label: 'Auth Users', description: 'Lista usuários para criação manual', icon: <Users className="w-5 h-5" />, status: 'pending' },
  ]);

  const completedSteps = steps.filter(s => s.status === 'success').length;
  const totalSteps = steps.length;
  const progressPercent = (completedSteps / totalSteps) * 100;

  const callEdgeFunction = async (action: string, extra?: Record<string, any>) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-to-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action,
        external_db_url: externalDbUrl,
        external_url: externalUrl,
        external_service_role_key: externalServiceRole,
        ...extra,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Edge function error');
    return json.data;
  };

  const handleTestConnection = async () => {
    if (!externalDbUrl.trim()) { toast.error('Informe a Database URL'); return; }
    setTestingConnection(true);
    setConnectionError('');
    try {
      const data = await callEdgeFunction('test-connection');
      if (data.connected) {
        setConnectionTested(true);
        toast.success('Conexão estabelecida com sucesso!');
      } else {
        setConnectionError(data.error || 'Falha na conexão');
        toast.error('Falha na conexão');
      }
    } catch (e: any) {
      setConnectionError(e.message);
      toast.error(e.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const updateStep = (id: string, updates: Partial<MigrationStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleRunStep = async (step: MigrationStep) => {
    updateStep(step.id, { status: 'running', result: undefined });
    try {
      const data = await callEdgeFunction(step.action);

      if (step.action === 'get-auth-users') {
        setAuthUsers(data);
        setShowAuthUsers(true);
        updateStep(step.id, { status: 'success', result: { success: data.length, failed: 0, errors: [] } });
        toast.success(`${data.length} usuários encontrados`);
        return;
      }

      updateStep(step.id, {
        status: data.failed > 0 ? 'error' : 'success',
        result: data,
      });

      if (data.failed > 0) {
        toast.error(`${step.label}: ${data.success} OK, ${data.failed} erros`);
      } else {
        toast.success(`${step.label}: ${data.success} operações com sucesso`);
      }
    } catch (e: any) {
      updateStep(step.id, { status: 'error', result: { success: 0, failed: 1, errors: [e.message] } });
      toast.error(`${step.label}: ${e.message}`);
    }
  };

  const statusIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending': return <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />;
      case 'running': return <Loader2 className="w-6 h-6 text-primary animate-spin" />;
      case 'success': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'error': return <XCircle className="w-6 h-6 text-destructive" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="w-5 h-5 text-primary" />
            Credenciais do Supabase de Destino
          </CardTitle>
          <CardDescription>
            Informe os dados do projeto Supabase externo para onde deseja migrar. As credenciais não são armazenadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Supabase URL</Label>
              <Input
                placeholder="https://xxxxx.supabase.co"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                disabled={connectionTested}
              />
            </div>
            <div className="space-y-2">
              <Label>Service Role Key</Label>
              <div className="relative">
                <Input
                  type={showServiceRole ? 'text' : 'password'}
                  placeholder="eyJhbGciOi..."
                  value={externalServiceRole}
                  onChange={e => setExternalServiceRole(e.target.value)}
                  disabled={connectionTested}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowServiceRole(!showServiceRole)}
                >
                  {showServiceRole ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Database URL (Connection String)</Label>
            <p className="text-xs text-muted-foreground">
              Encontre em: Supabase Dashboard → Settings → Database → Connection string → URI
            </p>
            <div className="relative">
              <Input
                type={showDbUrl ? 'text' : 'password'}
                placeholder="postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:6543/postgres"
                value={externalDbUrl}
                onChange={e => setExternalDbUrl(e.target.value)}
                disabled={connectionTested}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowDbUrl(!showDbUrl)}
              >
                {showDbUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {connectionError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {connectionError}
            </div>
          )}

          <div className="flex items-center gap-3">
            {connectionTested ? (
              <>
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Conectado
                </Badge>
                <Button variant="outline" size="sm" onClick={() => { setConnectionTested(false); setConnectionError(''); }}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Alterar credenciais
                </Button>
              </>
            ) : (
              <Button onClick={handleTestConnection} disabled={testingConnection || !externalDbUrl.trim()}>
                {testingConnection ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
                Testar Conexão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Migration Steps */}
      {connectionTested && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-primary" />
              Passos da Migração
            </CardTitle>
            <CardDescription>
              Execute cada passo individualmente na ordem indicada. Passos podem ser re-executados.
            </CardDescription>
            <Progress value={progressPercent} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">
              {completedSteps}/{totalSteps} passos concluídos
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/10 transition-colors"
              >
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">{idx + 1}</span>
                  {statusIcon(step.status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {step.icon}
                    <h4 className="font-medium text-sm">{step.label}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.description}</p>

                  {step.result && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-3 text-xs">
                        {step.result.success > 0 && (
                          <span className="text-green-500">✓ {step.result.success} OK</span>
                        )}
                        {step.result.failed > 0 && (
                          <span className="text-destructive">✗ {step.result.failed} erros</span>
                        )}
                      </div>
                      {step.result.tableResults && step.result.tableResults.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Tabelas: {step.result.tableResults.map(t => `${t.table} (${t.rows})`).join(', ')}
                        </div>
                      )}
                      {step.result.errors.length > 0 && (
                        <ScrollArea className="max-h-32 mt-1">
                          <div className="space-y-1">
                            {step.result.errors.slice(0, 10).map((err, i) => (
                              <p key={i} className="text-xs text-destructive/80 font-mono break-all">{err}</p>
                            ))}
                            {step.result.errors.length > 10 && (
                              <p className="text-xs text-muted-foreground">... e mais {step.result.errors.length - 10} erros</p>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={step.status === 'error' ? 'destructive' : step.status === 'success' ? 'outline' : 'default'}
                  disabled={step.status === 'running'}
                  onClick={() => handleRunStep(step)}
                  className="shrink-0"
                >
                  {step.status === 'running' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : step.status === 'error' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
                    </>
                  ) : step.status === 'success' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-executar
                    </>
                  ) : (
                    'Executar'
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Auth Users List */}
      {showAuthUsers && authUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Usuários Auth ({authUsers.length})
            </CardTitle>
            <CardDescription>
              Estes usuários precisam ser criados manualmente no Supabase de destino via Dashboard → Authentication → Users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {authUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: <span className="font-mono">{u.id}</span>
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.user_metadata?.full_name || ''}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MigrationWizard;
