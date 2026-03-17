import { Card, CardContent } from '@/components/ui/card';
import {
  Database, Shield, Users, HardDrive, Code, Table2, Key, Zap,
  Globe, Settings, BookOpen, Terminal, Info,
} from 'lucide-react';

const MIGRATION_STEPS = [
  { icon: Globe, title: 'Criar Novo Projeto Supabase', items: ['Acesse supabase.com/dashboard e crie um novo projeto', 'Anote: URL, anon key e service role key'], highlight: true },
  { icon: Database, title: 'Executar Schema (Passo 1 acima)', items: ['Exporte com "Estrutura do Banco" selecionado', 'No SQL Editor do novo projeto, cole e execute o SQL gerado', 'Isso cria: ENUMs → Tabelas → FKs → Índices'] },
  { icon: Code, title: 'Funções e Triggers (Passo 2 acima)', items: ['Exporte com "Funções e Triggers" selecionado', 'Execute no SQL Editor — ANTES das RLS policies', 'Inclui: is_super_admin, has_inbox_access, handle_new_user, etc.'] },
  { icon: Shield, title: 'RLS Policies (Passo 3 acima)', items: ['Exporte com "RLS Policies" selecionado', 'Execute no SQL Editor', 'Verifique que todas as tabelas têm RLS habilitado'] },
  { icon: HardDrive, title: 'Storage (Passo 4 acima)', items: ['Exporte com "Storage" selecionado', 'Execute os INSERTs para criar buckets e policies', '⚠️ Arquivos dentro dos buckets NÃO são migrados automaticamente'] },
  { icon: Table2, title: 'Dados Filtrados (Passo 5 acima)', items: ['Exporte com "Dados das Tabelas" selecionado', 'Inclui: perfis, roles, instâncias, inboxes, kanban, templates, etc.', 'Amostras: 5 conversas + 5 mensagens, 30 leads (para validação)', 'Execute os INSERTs no SQL Editor'], extra: 'Excluídas: contacts, broadcast_logs, instance_connection_logs, scheduled_message_logs, shift_report_logs, conversation_labels, kanban_cards, kanban_card_data' },
  { icon: Zap, title: 'Edge Functions', items: ['Copie a pasta supabase/functions/ para o novo projeto', 'Copie supabase/config.toml (atualize o project_id)', 'Deploy: supabase functions deploy --project-ref NOVO_ID'] },
  { icon: Key, title: 'Configurar Secrets', items: ['Via CLI: supabase secrets set NOME=valor --project-ref NOVO_ID', 'UAZAPI_SERVER_URL, UAZAPI_ADMIN_TOKEN, GROQ_API_KEY', 'SUPABASE_URL, ANON_KEY e SERVICE_ROLE_KEY são configurados automaticamente'] },
  { icon: Users, title: 'Usuários (Auth)', items: ['Senhas NÃO podem ser migradas — usuários precisarão redefinir', 'Recrie via: supabase auth admin create-user', 'Os dados de user_profiles e user_roles já estão nos dados exportados'] },
  { icon: Settings, title: 'Atualizar Frontend (.env)', items: ['Atualize o .env com as novas credenciais:', 'VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID', 'Atualize URLs de webhooks externos (n8n, etc.) para o novo projeto'] },
];

const EDGE_FUNCTIONS = [
  { name: 'uazapi-proxy', desc: 'Proxy para API UAZAPI (WhatsApp)' },
  { name: 'whatsapp-webhook', desc: 'Recebe webhooks do WhatsApp' },
  { name: 'admin-create-user', desc: 'Criação de usuários (admin)' },
  { name: 'admin-delete-user', desc: 'Exclusão de usuários (admin)' },
  { name: 'sync-conversations', desc: 'Sincroniza conversas do helpdesk' },
  { name: 'transcribe-audio', desc: 'Transcrição de áudio (Groq)' },
  { name: 'summarize-conversation', desc: 'Resumo de conversa com IA' },
  { name: 'auto-summarize', desc: 'Auto-resumo ao resolver conversa' },
  { name: 'analyze-summaries', desc: 'Análise inteligente de resumos' },
  { name: 'send-shift-report', desc: 'Relatório de turno automático' },
  { name: 'process-scheduled-messages', desc: 'Processa mensagens agendadas' },
  { name: 'fire-outgoing-webhook', desc: 'Dispara webhooks de saída' },
  { name: 'activate-ia', desc: 'Ativa/desativa IA na conversa' },
  { name: 'cleanup-old-media', desc: 'Limpeza de mídias antigas' },
  { name: 'database-backup', desc: 'Este módulo de backup' },
];

const BackupMigrationGuide = () => {
  return (
    <div className="space-y-4">
      {/* Migration Guide */}
      <h4 className="text-lg font-semibold flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Guia de Migração para Supabase
      </h4>
      <p className="text-sm text-muted-foreground">
        Siga os passos abaixo na ordem indicada para migrar seu projeto completo.
      </p>

      <div className="grid gap-3">
        {MIGRATION_STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <Card key={idx} className={idx === 0 ? 'border-primary/20' : undefined}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm flex items-center gap-2">
                      <Icon className="w-4 h-4" /> {step.title}
                    </h5>
                    <ul className="mt-2 text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                      {step.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                    {step.extra && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-[10px] text-muted-foreground">
                        <strong>Excluídas:</strong> {step.extra.replace('Excluídas: ', '')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edge Functions */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Edge Functions do Projeto
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {EDGE_FUNCTIONS.map(fn => (
            <div key={fn.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/50 border border-border/30">
              <Terminal className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{fn.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{fn.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          Observações Importantes
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
          <li>O SQL gerado usa <code className="px-1 py-0.5 rounded bg-muted text-foreground">ON CONFLICT DO NOTHING</code> nos INSERTs para permitir reimportação</li>
          <li><strong>Senhas</strong> de usuários NÃO são exportáveis por segurança</li>
          <li><strong>Secrets</strong> são criptografados — reconfigure manualmente</li>
          <li><strong>Realtime</strong>: reconfigure publicações: <code className="px-1 py-0.5 rounded bg-muted text-foreground">ALTER PUBLICATION supabase_realtime ADD TABLE nome_tabela;</code></li>
          <li><strong>CRON Jobs</strong>: reconfigure pg_cron se existirem</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupMigrationGuide;
