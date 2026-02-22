import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Play,
  Terminal,
  Zap,
  Clock,
  BarChart3,
  SkipForward,
  Square,
  CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';

type StepStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

interface StepResult {
  success: number;
  failed: number;
  errors: string[];
  details: string[];
  tableResults?: { table: string; rows: number }[];
}

interface MigrationStep {
  id: string;
  action: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
  result?: StepResult;
  duration?: number;
}

interface VerificationResult {
  source: Record<string, number>;
  target: Record<string, number>;
  details: string[];
  match: boolean;
}

interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const formatMs = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const MigrationWizard = () => {
  const [externalUrl, setExternalUrl] = useState('');
  const [externalServiceRole, setExternalServiceRole] = useState('');
  const [externalDbUrl, setExternalDbUrl] = useState('');
  const [showServiceRole, setShowServiceRole] = useState(false);
  const [showDbUrl, setShowDbUrl] = useState(false);

  const [connectionTested, setConnectionTested] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [connectionInfo, setConnectionInfo] = useState<{ database?: string; version?: string } | null>(null);

  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [showAuthUsers, setShowAuthUsers] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const abortRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [steps, setSteps] = useState<MigrationStep[]>([
    { id: 'schema', action: 'migrate-schema', label: 'Schema', description: 'ENUMs, Tabelas, FKs, Indexes', icon: <Database className="w-4 h-4" />, status: 'pending' },
    { id: 'functions', action: 'migrate-functions', label: 'Funções', description: 'Functions + indexes dependentes', icon: <Code className="w-4 h-4" />, status: 'pending' },
    { id: 'rls', action: 'migrate-rls', label: 'RLS & Policies', description: 'Enable RLS + Create Policies', icon: <Shield className="w-4 h-4" />, status: 'pending' },
    { id: 'triggers', action: 'migrate-triggers', label: 'Triggers', description: 'Triggers de automação', icon: <ArrowRight className="w-4 h-4" />, status: 'pending' },
    { id: 'storage', action: 'migrate-storage', label: 'Storage', description: 'Buckets + políticas de storage', icon: <HardDrive className="w-4 h-4" />, status: 'pending' },
    { id: 'data', action: 'migrate-data', label: 'Dados', description: 'Dados filtrados (exceto alto volume)', icon: <Table2 className="w-4 h-4" />, status: 'pending' },
    { id: 'auth', action: 'get-auth-users', label: 'Auth Users', description: 'Lista usuários para criação manual', icon: <Users className="w-4 h-4" />, status: 'pending' },
  ]);

  const completedSteps = steps.filter(s => s.status === 'success' || s.status === 'skipped').length;
  const totalSteps = steps.length;
  const progressPercent = (completedSteps / totalSteps) * 100;
  const allDone = completedSteps === totalSteps;

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      const start = Date.now() - totalElapsed;
      timerRef.current = setInterval(() => setTotalElapsed(Date.now() - start), 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const addLog = useCallback((step: string, message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR'), step, message, type }]);
  }, []);

  const callEdgeFunction = async (action: string) => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/migrate-to-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        action,
        external_db_url: externalDbUrl,
        external_url: externalUrl,
        external_service_role_key: externalServiceRole,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Edge function error');
    return json;
  };

  const handleTestConnection = async () => {
    if (!externalDbUrl.trim()) { toast.error('Informe a Database URL'); return; }
    setTestingConnection(true);
    setConnectionError('');
    setConnectionInfo(null);
    try {
      const { data } = await callEdgeFunction('test-connection');
      if (data.connected) {
        setConnectionTested(true);
        setConnectionInfo({ database: data.database, version: data.version });
        addLog('connection', `Conexão estabelecida: ${data.database} - ${data.version}`, 'success');
        toast.success('Conexão estabelecida!');
      } else {
        setConnectionError(data.error || 'Falha na conexão');
        addLog('connection', `Falha: ${data.error}`, 'error');
        toast.error('Falha na conexão');
      }
    } catch (e: any) {
      setConnectionError(e.message);
      addLog('connection', e.message, 'error');
      toast.error(e.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const updateStep = (id: string, updates: Partial<MigrationStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const executeStep = async (step: MigrationStep): Promise<boolean> => {
    updateStep(step.id, { status: 'running', result: undefined, duration: undefined });
    addLog(step.label, `Iniciando ${step.label}...`, 'info');
    const start = Date.now();

    try {
      const json = await callEdgeFunction(step.action);
      const duration = Date.now() - start;

      if (step.action === 'get-auth-users') {
        const users = json.data || [];
        setAuthUsers(users);
        setShowAuthUsers(true);
        const details = json.details || users.map((u: any) => `✓ ${u.email}`);
        details.forEach((d: string) => addLog(step.label, d, 'success'));
        updateStep(step.id, { status: 'success', result: { success: users.length, failed: 0, errors: [], details }, duration });
        addLog(step.label, `Concluído em ${formatMs(duration)} - ${users.length} usuários`, 'success');
        return true;
      }

      const data = json.data as StepResult;
      // Push all details as logs
      if (data.details) {
        data.details.forEach((d: string) => {
          const type = d.startsWith('✓') ? 'success' : d.startsWith('✗') ? 'error' : d.startsWith('⚠') ? 'warning' : 'info';
          addLog(step.label, d, type);
        });
      }

      const status = data.failed > 0 ? 'error' : 'success';
      updateStep(step.id, { status, result: data, duration });
      addLog(step.label, `Concluído em ${formatMs(duration)} - ${data.success} OK, ${data.failed} erros`, status === 'error' ? 'warning' : 'success');

      return data.failed === 0;
    } catch (e: any) {
      const duration = Date.now() - start;
      updateStep(step.id, { status: 'error', result: { success: 0, failed: 1, errors: [e.message], details: [] }, duration });
      addLog(step.label, `Erro: ${e.message}`, 'error');
      return false;
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    setPausedAt(null);
    abortRef.current = false;
    setLogs([]);
    setVerification(null);
    setTotalElapsed(0);
    setTimerRunning(true);
    // Reset all steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending' as StepStatus, result: undefined, duration: undefined })));
    addLog('sistema', '🚀 Iniciando migração automática...', 'info');

    const stepsToRun = [...steps];
    for (const step of stepsToRun) {
      if (abortRef.current) {
        addLog('sistema', '⛔ Migração abortada pelo usuário', 'warning');
        break;
      }

      const success = await executeStep(step);

      if (!success && !abortRef.current) {
        setPausedAt(step.id);
        addLog('sistema', `⏸ Pausado no passo "${step.label}". Escolha: Retry, Pular ou Abortar.`, 'warning');
        setTimerRunning(false);
        return; // Don't set runningAll to false yet—user will choose
      }
    }

    setTimerRunning(false);
    setRunningAll(false);

    if (!abortRef.current) {
      addLog('sistema', '✅ Todos os passos concluídos! Executando verificação...', 'success');
      await handleVerify();
    }
  };

  const handleResume = async (action: 'retry' | 'skip' | 'abort') => {
    if (action === 'abort') {
      abortRef.current = true;
      setPausedAt(null);
      setRunningAll(false);
      addLog('sistema', '⛔ Migração abortada', 'warning');
      return;
    }

    const pausedStep = steps.find(s => s.id === pausedAt);
    setPausedAt(null);
    setTimerRunning(true);

    if (action === 'skip' && pausedStep) {
      updateStep(pausedStep.id, { status: 'skipped' });
      addLog(pausedStep.label, 'Passo pulado pelo usuário', 'warning');
    }

    // Continue from paused step (or next if skipped)
    const startIdx = steps.findIndex(s => s.id === pausedAt) + (action === 'skip' ? 1 : 0);
    const remaining = steps.slice(action === 'retry' ? startIdx : startIdx);

    for (const step of remaining) {
      if (abortRef.current) break;
      const success = await executeStep(step);
      if (!success && !abortRef.current) {
        setPausedAt(step.id);
        addLog('sistema', `⏸ Pausado no passo "${step.label}"`, 'warning');
        setTimerRunning(false);
        return;
      }
    }

    setTimerRunning(false);
    setRunningAll(false);

    if (!abortRef.current) {
      addLog('sistema', '✅ Migração concluída! Verificando...', 'success');
      await handleVerify();
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    addLog('verificação', 'Comparando origem vs destino...', 'info');
    try {
      const { data } = await callEdgeFunction('verify-migration');
      setVerification(data);
      if (data.details) {
        data.details.forEach((d: string) => {
          addLog('verificação', d, d.startsWith('✓') ? 'success' : 'warning');
        });
      }
      addLog('verificação', data.match ? '✅ Migração verificada com sucesso!' : '⚠ Diferenças encontradas', data.match ? 'success' : 'warning');
    } catch (e: any) {
      addLog('verificação', `Erro: ${e.message}`, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const stepStatusStyles = (status: StepStatus) => {
    switch (status) {
      case 'pending': return 'border-border/40 bg-card';
      case 'running': return 'border-primary/50 bg-primary/5 ring-1 ring-primary/20';
      case 'success': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'error': return 'border-destructive/30 bg-destructive/5';
      case 'skipped': return 'border-muted-foreground/20 bg-muted/30 opacity-60';
    }
  };

  const statusIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending': return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
      case 'running': return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-destructive" />;
      case 'skipped': return <SkipForward className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const logTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="w-4 h-4 text-primary" />
            Credenciais do Supabase de Destino
          </CardTitle>
          <CardDescription className="text-xs">
            As credenciais são usadas apenas durante a migração e não são armazenadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Supabase URL</Label>
              <Input placeholder="https://xxxxx.supabase.co" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} disabled={connectionTested} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Service Role Key</Label>
              <div className="relative">
                <Input type={showServiceRole ? 'text' : 'password'} placeholder="eyJhbGciOi..." value={externalServiceRole} onChange={e => setExternalServiceRole(e.target.value)} disabled={connectionTested} className="h-9 text-sm pr-9" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowServiceRole(!showServiceRole)}>
                  {showServiceRole ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Database URL (Connection String)</Label>
            <div className="relative">
              <Input type={showDbUrl ? 'text' : 'password'} placeholder="postgresql://postgres.xxx:password@..." value={externalDbUrl} onChange={e => setExternalDbUrl(e.target.value)} disabled={connectionTested} className="h-9 text-sm pr-9" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowDbUrl(!showDbUrl)}>
                {showDbUrl ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
            </div>
          </div>

          {connectionError && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {connectionError}
            </div>
          )}

          <div className="flex items-center gap-3">
            {connectionTested ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
                </Badge>
                {connectionInfo && (
                  <span className="text-xs text-muted-foreground font-mono">{connectionInfo.database} • {connectionInfo.version}</span>
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setConnectionTested(false); setConnectionError(''); setConnectionInfo(null); }}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Alterar
                </Button>
              </div>
            ) : (
              <Button onClick={handleTestConnection} disabled={testingConnection || !externalDbUrl.trim()} size="sm" className="h-8">
                {testingConnection ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plug className="w-3.5 h-3.5 mr-1.5" />}
                Testar Conexão
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main migration area - two columns */}
      {connectionTested && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Left: Steps Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {/* Controls */}
            <Card className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!runningAll && !pausedAt ? (
                      <Button onClick={handleRunAll} size="sm" className="h-8 gap-1.5" disabled={allDone}>
                        <Zap className="w-3.5 h-3.5" /> Executar Tudo
                      </Button>
                    ) : pausedAt ? (
                      <div className="flex gap-1.5">
                        <Button onClick={() => handleResume('retry')} size="sm" variant="default" className="h-7 text-xs gap-1">
                          <RotateCcw className="w-3 h-3" /> Retry
                        </Button>
                        <Button onClick={() => handleResume('skip')} size="sm" variant="secondary" className="h-7 text-xs gap-1">
                          <SkipForward className="w-3 h-3" /> Pular
                        </Button>
                        <Button onClick={() => handleResume('abort')} size="sm" variant="destructive" className="h-7 text-xs gap-1">
                          <Square className="w-3 h-3" /> Abortar
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => { abortRef.current = true; }} size="sm" variant="destructive" className="h-7 text-xs gap-1">
                        <Square className="w-3 h-3" /> Parar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{formatMs(totalElapsed)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-[11px] text-muted-foreground">{completedSteps}/{totalSteps} passos</p>
                </div>
              </CardContent>
            </Card>

            {/* Steps */}
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[18px] top-4 bottom-4 w-px bg-border/50" />

              {steps.map((step, idx) => (
                <div key={step.id} className="relative pl-10 pb-2">
                  {/* Timeline dot */}
                  <div className="absolute left-[10px] top-3 z-10">
                    {statusIcon(step.status)}
                  </div>

                  <div className={`rounded-lg border p-3 transition-all duration-300 ${stepStatusStyles(step.status)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground">{step.icon}</span>
                        <h4 className="text-sm font-medium truncate">{step.label}</h4>
                        {step.duration !== undefined && (
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{formatMs(step.duration)}</span>
                        )}
                      </div>
                      {!runningAll && !pausedAt && step.status !== 'running' && (
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0" onClick={() => executeStep(step)} title="Executar passo">
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>

                    {step.result && (
                      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                        {step.result.success > 0 && <span className="text-emerald-500">✓ {step.result.success}</span>}
                        {step.result.failed > 0 && <span className="text-destructive">✗ {step.result.failed}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Verify button */}
            {allDone && (
              <Button onClick={handleVerify} disabled={verifying} variant="outline" size="sm" className="w-full h-8 gap-1.5">
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
                Verificar Migração
              </Button>
            )}
          </div>

          {/* Right: Logs Terminal + Verification */}
          <div className="lg:col-span-3 space-y-4">
            {/* Terminal */}
            <Card className="border-border/50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono text-slate-300">Logs de Migração</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
              </div>
              <ScrollArea className="h-[400px]">
                <div className="bg-slate-950 p-3 font-mono text-[11px] leading-relaxed min-h-full">
                  {logs.length === 0 ? (
                    <p className="text-slate-600 italic">Aguardando início da migração...</p>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className="flex gap-2 hover:bg-slate-900/50 px-1 py-0.5 rounded">
                        <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                        <span className="text-slate-500 shrink-0 w-20 truncate">[{log.step}]</span>
                        <span className={logTypeColor(log.type)}>{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </Card>

            {/* Verification Results */}
            {verification && (
              <Card className="border-border/50">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {verification.match ? (
                      <CheckCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    Verificação {verification.match ? 'OK' : 'com diferenças'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                    <div className="text-muted-foreground font-semibold">Objeto</div>
                    <div className="text-muted-foreground font-semibold text-center">Origem</div>
                    <div className="text-muted-foreground font-semibold text-center">Destino</div>
                    {['tables', 'functions', 'policies', 'triggers'].map(key => {
                      const s = verification.source[key] || 0;
                      const t = verification.target[key] || 0;
                      const match = t >= s;
                      return (
                        <React.Fragment key={key}>
                          <div className="capitalize py-1 border-t border-border/30">{key}</div>
                          <div className="text-center py-1 border-t border-border/30">{s}</div>
                          <div className={`text-center py-1 border-t border-border/30 ${match ? 'text-emerald-500' : 'text-amber-500 font-bold'}`}>{t}</div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Auth Users */}
      {showAuthUsers && authUsers.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              Usuários Auth ({authUsers.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Crie estes usuários manualmente no Supabase de destino (Authentication → Users).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {authUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/20 text-xs">
                    <span className="font-medium">{u.email}</span>
                    <span className="font-mono text-muted-foreground">{u.id.substring(0, 8)}...</span>
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
