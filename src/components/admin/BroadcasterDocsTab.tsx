import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';

const markdownContent = `# Documentação Técnica — Módulo Disparador (Broadcaster)

## 1. Visão Geral

O módulo Disparador permite envio em massa de mensagens via WhatsApp para **grupos** ou **contatos individuais (leads)**. Suporta três tipos de mensagem:

- **Texto** — mensagem simples com formatação WhatsApp
- **Mídia** — imagem, vídeo, documento ou áudio (até 10 MB) com legenda opcional
- **Carrossel** — 2 a 10 cards interativos com imagem, corpo, rodapé e até 2 botões cada

---

## 2. Arquitetura de Código

### 2.1 Páginas

| Arquivo | Descrição |
|---------|-----------|
| \`src/pages/dashboard/Broadcaster.tsx\` | Disparador para grupos — seleciona instância, grupos e compõe mensagem |
| \`src/pages/dashboard/LeadsBroadcaster.tsx\` | Disparador para leads — seleciona base de dados e contatos individuais |
| \`src/pages/dashboard/BroadcastHistoryPage.tsx\` | Histórico de disparos com filtros e detalhes |
| \`src/pages/dashboard/SendToGroup.tsx\` | Envio direto para um grupo específico |
| \`src/pages/dashboard/ScheduledMessages.tsx\` | Gerenciamento de mensagens agendadas |

### 2.2 Hooks

| Hook | Responsabilidade |
|------|-----------------|
| \`useBroadcastForm.ts\` | Estado do formulário de disparo (instância, grupos, tipo de mensagem) |
| \`useBroadcastSend.ts\` | Loop de envio unificado (\`runSendLoop\`) com pause/resume/cancel, delays e log |
| \`useBroadcastMedia.ts\` | Upload e preview de mídia (imagem, vídeo, documento, áudio) |
| \`useBroadcastCarousel.ts\` | Gerenciamento de cards do carrossel (adicionar, remover, editar, reordenar) |
| \`useLeadMessageForm.ts\` | Formulário e loop de envio para leads (texto, mídia, carrossel) |
| \`useLeadsBroadcaster.ts\` | Orquestração do disparador de leads (bases de dados, seleção, importação) |
| \`useBroadcastHistory.ts\` | Busca e filtros do histórico de disparos |
| \`useLeadImport.ts\` | Importação de leads via CSV, colagem, manual ou grupos |
| \`useMessageTemplates.ts\` | CRUD de templates de mensagens reutilizáveis |

### 2.3 Componentes (\`src/components/broadcast/\`)

| Componente | Função |
|------------|--------|
| \`BroadcastMessageForm\` | Formulário principal com abas texto/mídia/carrossel |
| \`BroadcastTextTab\` | Aba de mensagem de texto com contagem de caracteres |
| \`BroadcastMediaTab\` | Aba de upload de mídia com preview |
| \`BroadcastCommonControls\` | Controles comuns (delay, excluir admins) |
| \`BroadcasterHeader\` | Cabeçalho com título e seleção de instância |
| \`BroadcastProgressModal\` | Modal de progresso com barra, contadores e controles pause/resume/cancel |
| \`BroadcastHistory\` | Lista de histórico com cards expansíveis |
| \`BroadcastHistoryFilters\` | Filtros por instância, tipo, status e período |
| \`BroadcastHistoryLogItem\` | Card individual de log com detalhes e estatísticas |
| \`CarouselEditor\` | Editor visual de carrossel com drag-and-drop |
| \`CarouselCardEditor\` | Editor de card individual (imagem, texto, botões) |
| \`CarouselButtonEditor\` | Editor de botões do card (URL, resposta rápida, telefone) |
| \`CarouselPreview\` | Preview visual do carrossel antes do envio |
| \`HistoryCarouselPreview\` | Preview de carrossel no histórico |
| \`MessagePreview\` | Preview geral da mensagem (texto, mídia ou carrossel) |
| \`GroupSelector\` | Seleção de grupos com busca e checkbox |
| \`ParticipantSelector\` | Seleção de participantes dentro de um grupo |
| \`InstanceSelector\` | Dropdown de seleção de instância WhatsApp |
| \`TemplateSelector\` | Seletor de templates salvos |
| \`WizardSteps\` | Indicador de etapas do wizard de disparo |
| \`ResendBanner\` | Banner de reenvio para destinatários com falha |
| \`ResendOptionsDialog\` | Dialog de opções de reenvio |
| \`LeadDatabasePicker\` | Seletor de base de dados de leads |
| \`LeadDatabaseSelector\` | Dropdown de seleção de base |
| \`LeadList\` | Lista de leads com checkbox e busca |
| \`LeadContactsCard\` | Card de contatos selecionados |
| \`LeadsSummaryCard\` | Resumo de leads selecionados antes do envio |
| \`LeadImporter\` | Container das abas de importação |
| \`LeadMessageForm\` | Formulário de mensagem para leads |
| \`LeadSendControls\` | Controles de envio para leads |
| \`ImportCsvTab\` | Importação via arquivo CSV |
| \`ImportPasteTab\` | Importação via colagem de números |
| \`ImportManualTab\` | Importação manual de contatos |
| \`ImportGroupsTab\` | Importação de membros de grupos |
| \`CreateLeadDatabaseDialog\` | Dialog para criar nova base de leads |
| \`EditDatabaseDialog\` | Dialog para editar base existente |
| \`ManageLeadDatabaseDialog\` | Dialog para gerenciar leads dentro de uma base |

### 2.4 Utilitários

| Arquivo | Função |
|---------|--------|
| \`src/lib/uazapiProxy.ts\` | Helper centralizado para chamadas ao edge function \`uazapi-proxy\`. Injeta token de auth automaticamente. Possui variante \`callUazapiProxyWithToken\` para loops sem re-fetch de sessão. |
| \`src/lib/saveToHelpdesk.ts\` | Salva mensagens enviadas no helpdesk (cria conversa se necessário) |
| \`src/lib/uploadCarouselImage.ts\` | Upload de imagens do carrossel para o Storage bucket \`carousel-images\` |
| \`src/lib/formatPhone.ts\` | Formatação e normalização de números de telefone |

---

## 3. Tabelas do Banco de Dados

### 3.1 \`broadcast_logs\`

Registra cada disparo realizado com estatísticas de sucesso/falha.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| \`id\` | uuid (PK) | Identificador único |
| \`user_id\` | uuid | Usuário que realizou o disparo |
| \`instance_id\` | text | ID da instância WhatsApp utilizada |
| \`instance_name\` | text | Nome da instância |
| \`message_type\` | text | Tipo: \`text\`, \`media\`, \`carousel\` |
| \`content\` | text | Conteúdo da mensagem |
| \`media_url\` | text | URL da mídia (se aplicável) |
| \`carousel_data\` | jsonb | Dados do carrossel (se aplicável) |
| \`groups_targeted\` | int | Quantidade de grupos alvo |
| \`group_names\` | text[] | Nomes dos grupos |
| \`recipients_targeted\` | int | Total de destinatários |
| \`recipients_success\` | int | Envios com sucesso |
| \`recipients_failed\` | int | Envios com falha |
| \`exclude_admins\` | bool | Se excluiu admins dos grupos |
| \`random_delay\` | text | Configuração de delay (ex: \`2-5\`) |
| \`status\` | text | \`sending\`, \`completed\`, \`failed\`, \`cancelled\` |
| \`error_message\` | text | Mensagem de erro (se falhou) |
| \`started_at\` | timestamptz | Início do disparo |
| \`completed_at\` | timestamptz | Fim do disparo |
| \`duration_seconds\` | int | Duração total em segundos |
| \`created_at\` | timestamptz | Data de criação do registro |

### 3.2 \`lead_databases\`

Bases de dados de contatos para disparo individual.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| \`id\` | uuid (PK) | Identificador único |
| \`user_id\` | uuid | Proprietário da base |
| \`name\` | text | Nome da base |
| \`description\` | text | Descrição opcional |
| \`instance_id\` | text | Instância associada |
| \`leads_count\` | int | Contagem de leads |
| \`created_at\` | timestamptz | Data de criação |
| \`updated_at\` | timestamptz | Última atualização |

### 3.3 \`lead_database_entries\`

Contatos individuais dentro de uma base de leads.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| \`id\` | uuid (PK) | Identificador único |
| \`database_id\` | uuid (FK) | Referência à \`lead_databases\` |
| \`phone\` | text | Número de telefone |
| \`jid\` | text | JID do WhatsApp (\`numero@s.whatsapp.net\`) |
| \`name\` | text | Nome do contato |
| \`group_name\` | text | Grupo de origem (se importado) |
| \`source\` | text | Origem: \`csv\`, \`paste\`, \`manual\`, \`group\` |
| \`is_verified\` | bool | Se o número foi verificado |
| \`verification_status\` | text | Status da verificação |
| \`verified_name\` | text | Nome verificado pelo WhatsApp |
| \`created_at\` | timestamptz | Data de criação |

### 3.4 \`scheduled_messages\`

Mensagens agendadas para envio futuro (único ou recorrente).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| \`id\` | uuid (PK) | Identificador único |
| \`user_id\` | uuid | Usuário que agendou |
| \`instance_id\` | uuid (FK) | Instância WhatsApp |
| \`group_jid\` | text | JID do grupo alvo |
| \`group_name\` | text | Nome do grupo |
| \`message_type\` | text | Tipo da mensagem |
| \`content\` | text | Conteúdo |
| \`media_url\` | text | URL da mídia |
| \`filename\` | text | Nome do arquivo |
| \`exclude_admins\` | bool | Excluir admins |
| \`random_delay\` | text | Delay aleatório |
| \`recipients\` | jsonb | Lista de destinatários |
| \`scheduled_at\` | timestamptz | Data/hora agendada |
| \`next_run_at\` | timestamptz | Próxima execução |
| \`is_recurring\` | bool | Se é recorrente |
| \`recurrence_type\` | text | Tipo: \`daily\`, \`weekly\`, \`monthly\` |
| \`recurrence_interval\` | int | Intervalo de recorrência |
| \`recurrence_days\` | int[] | Dias da semana (0-6) |
| \`recurrence_count\` | int | Máximo de execuções |
| \`recurrence_end_at\` | timestamptz | Data fim da recorrência |
| \`executions_count\` | int | Execuções realizadas |
| \`last_executed_at\` | timestamptz | Última execução |
| \`last_error\` | text | Último erro |
| \`status\` | text | \`pending\`, \`completed\`, \`cancelled\`, \`paused\` |
| \`created_at\` | timestamptz | Data de criação |
| \`updated_at\` | timestamptz | Última atualização |

### 3.5 \`scheduled_message_logs\`

Logs de execução de mensagens agendadas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| \`id\` | uuid (PK) | Identificador único |
| \`scheduled_message_id\` | uuid (FK) | Referência à \`scheduled_messages\` |
| \`status\` | text | Status da execução |
| \`recipients_total\` | int | Total de destinatários |
| \`recipients_success\` | int | Sucessos |
| \`recipients_failed\` | int | Falhas |
| \`error_message\` | text | Mensagem de erro |
| \`response_data\` | jsonb | Dados da resposta |
| \`executed_at\` | timestamptz | Data/hora da execução |

### 3.6 \`message_templates\`

Templates reutilizáveis de mensagens.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| \`id\` | uuid (PK) | Identificador único |
| \`user_id\` | uuid | Proprietário |
| \`name\` | text | Nome do template |
| \`category\` | text | Categoria opcional |
| \`message_type\` | text | Tipo: \`text\`, \`media\`, \`carousel\` |
| \`content\` | text | Conteúdo do texto |
| \`media_url\` | text | URL da mídia |
| \`filename\` | text | Nome do arquivo |
| \`carousel_data\` | jsonb | Dados do carrossel |
| \`created_at\` | timestamptz | Data de criação |
| \`updated_at\` | timestamptz | Última atualização |

---

## 4. Storage Buckets

### \`carousel-images\` (público)

Armazena imagens dos cards do carrossel. Upload realizado via \`uploadCarouselImage.ts\`.

- **Política de acesso:** público (qualquer um pode ler via URL)
- **Formato do path:** \`{userId}/{timestamp}-{index}.{ext}\`
- **Tipos aceitos:** image/jpeg, image/png, image/webp

### \`helpdesk-media\` (público)

Armazena mídias gerais do helpdesk (usado indiretamente quando mensagens são salvas via \`saveToHelpdesk\`).

### \`audio-messages\` (público)

Armazena gravações de áudio enviadas pelo helpdesk.

---

## 5. Endpoints UAZAPI (via proxy)

Todas as chamadas ao servidor UAZAPI passam pela edge function \`uazapi-proxy\` que:
1. Valida autenticação do usuário
2. Busca o token da instância no banco
3. Aplica validação SSRF em URLs
4. Roteia para o handler correto

### 5.1 \`send-message\` → POST \`/send/text\`

Envia mensagem de texto simples.

\`\`\`json
{
  "action": "send-message",
  "instanceId": "uuid-da-instancia",
  "to": "5511999999999@s.whatsapp.net",
  "message": "Texto da mensagem"
}
\`\`\`

### 5.2 \`send-media\` → POST \`/send/media\`

Envia mídia com legenda opcional.

\`\`\`json
{
  "action": "send-media",
  "instanceId": "uuid-da-instancia",
  "to": "5511999999999@s.whatsapp.net",
  "mediaUrl": "https://url-da-midia.com/arquivo.jpg",
  "caption": "Legenda opcional",
  "filename": "arquivo.pdf"
}
\`\`\`

### 5.3 \`send-carousel\` → POST \`/send/carousel\`

Envia carrossel interativo com cards.

\`\`\`json
{
  "action": "send-carousel",
  "instanceId": "uuid-da-instancia",
  "to": "5511999999999@s.whatsapp.net",
  "cards": [
    {
      "header": { "type": "image", "url": "https://..." },
      "body": "Texto do card",
      "footer": "Rodapé",
      "buttons": [
        { "type": "url", "text": "Ver mais", "url": "https://..." },
        { "type": "reply", "text": "Quero saber mais" }
      ]
    }
  ]
}
\`\`\`

**Validação de imagem:** URLs de imagem passam por validação SSRF. Base64 data URIs são aceitos e convertidos internamente.

### 5.4 \`send-chat\` → POST \`/send/text\`

Envio de chat direto (usado pelo helpdesk).

\`\`\`json
{
  "action": "send-chat",
  "instanceId": "uuid-da-instancia",
  "to": "5511999999999@s.whatsapp.net",
  "message": "Mensagem do chat"
}
\`\`\`

### 5.5 \`send-audio\` → POST \`/send/audio\`

Envia mensagem de áudio.

\`\`\`json
{
  "action": "send-audio",
  "instanceId": "uuid-da-instancia",
  "to": "5511999999999@s.whatsapp.net",
  "audioUrl": "https://url-do-audio.ogg"
}
\`\`\`

### 5.6 \`check-numbers\` → POST \`/chat/check\`

Verifica se números possuem WhatsApp.

\`\`\`json
{
  "action": "check-numbers",
  "instanceId": "uuid-da-instancia",
  "numbers": ["5511999999999", "5521988888888"]
}
\`\`\`

**Resposta:**
\`\`\`json
{
  "valid": ["5511999999999@s.whatsapp.net"],
  "invalid": ["5521988888888"]
}
\`\`\`

### 5.7 \`groups\` → GET \`/group/list\`

Lista todos os grupos da instância.

### 5.8 \`group-info\` → GET \`/group/info\`

Retorna informações e participantes de um grupo.

### 5.9 \`resolve-lids\` → POST \`/chat/resolve-lids\`

Resolve LIDs (@lid) para números reais de WhatsApp.

---

## 6. Fluxo de Envio (runSendLoop)

O envio segue um loop unificado implementado em \`useBroadcastSend.ts\`:

\`\`\`
1. Validação inicial (instância, destinatários, conteúdo)
2. Criação do registro em broadcast_logs (status: 'sending')
3. Deduplicação de destinatários (remove JIDs duplicados)
4. Para cada destinatário:
   a. Verifica se pausado → aguarda resume
   b. Verifica se cancelado → interrompe
   c. Envia mensagem via uazapi-proxy
   d. Atualiza contadores (success/failed)
   e. Aplica delay aleatório entre envios
5. Atualiza broadcast_logs (status: 'completed' ou 'failed')
6. Calcula duração total
\`\`\`

### Controles do Loop

- **Pause:** Define flag que faz o loop aguardar em um polling interval
- **Resume:** Remove flag, loop continua
- **Cancel:** Define flag de cancelamento, loop interrompe no próximo ciclo

### Delays

O delay entre envios é configurável no formato \`min-max\` (ex: \`2-5\` = entre 2 e 5 segundos). O valor é randomizado dentro do intervalo para simular comportamento humano.

---

## 7. Constantes e Limites

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| MAX_MESSAGE_LENGTH | 4096 | Limite de caracteres por mensagem |
| MAX_FILE_SIZE | 10 MB | Tamanho máximo de mídia |
| MIN_CAROUSEL_CARDS | 2 | Mínimo de cards no carrossel |
| MAX_CAROUSEL_CARDS | 10 | Máximo de cards no carrossel |
| MAX_BUTTONS_PER_CARD | 2 | Máximo de botões por card |
| DEFAULT_DELAY | "2-5" | Delay padrão entre envios (segundos) |

---

## 8. Integração com Helpdesk

A função \`saveToHelpdesk\` (\`src/lib/saveToHelpdesk.ts\`) é chamada opcionalmente após o envio para:

1. Buscar ou criar contato na tabela \`contacts\`
2. Buscar ou criar conversa na tabela \`conversations\`
3. Inserir mensagem na tabela \`conversation_messages\` com \`direction: 'outgoing'\`

Isso permite que mensagens enviadas pelo disparador apareçam no histórico do helpdesk.

---

## 9. Agendamento de Mensagens

### Fluxo

1. Usuário cria agendamento via \`ScheduleMessageDialog\`
2. Registro inserido em \`scheduled_messages\` com \`status: 'pending'\`
3. Edge function \`process-scheduled-messages\` executa via cron job:
   a. Busca mensagens com \`next_run_at <= now()\` e \`status = 'pending'\`
   b. Para cada mensagem, envia via UAZAPI
   c. Registra resultado em \`scheduled_message_logs\`
   d. Se recorrente, calcula próximo \`next_run_at\`
   e. Se não recorrente ou atingiu limite, marca como \`completed\`

### Tipos de Recorrência

- **daily** — Todo dia no horário especificado
- **weekly** — Nos dias da semana selecionados (\`recurrence_days\`)
- **monthly** — A cada N meses

---

## 10. Edge Functions Relacionadas

| Função | Descrição |
|--------|-----------|
| \`uazapi-proxy\` | Proxy central para todas as chamadas UAZAPI |
| \`process-scheduled-messages\` | Processamento de mensagens agendadas (cron) |
| \`whatsapp-webhook\` | Recebe webhooks do WhatsApp e processa mensagens recebidas |
| \`fire-outgoing-webhook\` | Dispara webhooks outgoing para integrações externas (n8n) |

---

*Documentação gerada automaticamente pelo sistema WsmartQR.*
*Última atualização: ${new Date().toLocaleDateString('pt-BR')}*
`;

const BroadcasterDocsTab: React.FC = () => {
  const downloadDocs = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'documentacao-disparador.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-semibold">Documentação do Disparador</h2>
        </div>
        <Button onClick={downloadDocs} className="gap-2">
          <Download className="w-4 h-4" />
          Baixar .md
        </Button>
      </div>
      <Card className="border-border/40">
        <CardContent className="p-4 sm:p-6">
          <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-mono leading-relaxed max-h-[70vh] overflow-y-auto">
            {markdownContent}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcasterDocsTab;
