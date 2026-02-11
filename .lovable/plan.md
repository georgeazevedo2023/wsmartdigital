

# Fase 1: Central de Atendimento - Banco de Dados + UI Basica

## Visao Geral

Criar a fundacao do modulo de helpdesk: tabelas no banco de dados com RLS, edge function de webhook para receber mensagens da UAZAPI, e interface basica estilo Chatwoot com lista de conversas e chat.

---

## 1. Banco de Dados - Novas Tabelas e Enums

### 1.1 Enum `inbox_role`

```sql
CREATE TYPE public.inbox_role AS ENUM ('admin', 'gestor', 'agente', 'vendedor');
```

### 1.2 Tabela `inboxes`

Cada inbox mapeia para uma instancia WhatsApp.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| instance_id | text (FK instances) | Instancia UAZAPI vinculada |
| name | text | Nome da caixa de entrada |
| created_by | uuid | Usuario que criou |
| created_at | timestamptz | Data de criacao |

### 1.3 Tabela `inbox_users`

Relacao muitos-para-muitos entre usuarios e inboxes, com role por inbox.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| inbox_id | uuid (FK inboxes) | Referencia a inbox |
| user_id | uuid | Referencia ao usuario |
| role | inbox_role | Papel nesta inbox |
| is_available | boolean | Status online/offline |
| created_at | timestamptz | Data de criacao |

### 1.4 Tabela `contacts`

Contatos do WhatsApp (extraidos das conversas).

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| phone | text | Numero do telefone |
| jid | text (unique) | JID do WhatsApp |
| name | text | Nome do contato |
| profile_pic_url | text | Foto de perfil |
| created_at | timestamptz | Data de criacao |

### 1.5 Tabela `conversations`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| inbox_id | uuid (FK inboxes) | Inbox desta conversa |
| contact_id | uuid (FK contacts) | Contato vinculado |
| status | text | aberta, pendente, resolvida |
| priority | text | alta, media, baixa |
| assigned_to | uuid | Usuario responsavel |
| is_read | boolean | Se foi lida |
| last_message_at | timestamptz | Ultima mensagem (para ordenacao) |
| created_at | timestamptz | Data de criacao |
| updated_at | timestamptz | Ultima atualizacao |

### 1.6 Tabela `conversation_messages`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| conversation_id | uuid (FK conversations) | Conversa vinculada |
| direction | text | incoming, outgoing, private_note |
| content | text | Texto da mensagem |
| media_type | text | text, audio, image, video, pdf |
| media_url | text | URL da midia |
| sender_id | uuid | Usuario que enviou (se outgoing) |
| external_id | text | ID da mensagem na UAZAPI |
| created_at | timestamptz | Data de criacao |

### 1.7 Tabela `labels` (etiquetas)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| name | text | Nome da etiqueta |
| color | text | Cor hex |
| inbox_id | uuid (FK inboxes) | Inbox vinculada |
| created_at | timestamptz | Data de criacao |

### 1.8 Tabela `conversation_labels`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | ID unico |
| conversation_id | uuid (FK conversations) | Conversa |
| label_id | uuid (FK labels) | Etiqueta |

### 1.9 Realtime

Habilitar realtime para `conversations` e `conversation_messages` para atualizacoes em tempo real.

### 1.10 RLS Policies

Todas as tabelas terao RLS habilitado. As politicas serao baseadas em:
- **Super admins**: acesso total (via `is_super_admin()`)
- **Usuarios de inbox**: acesso apenas a dados de inboxes onde tem acesso (via subquery em `inbox_users`)
- Funcao helper `has_inbox_access(user_id, inbox_id)` SECURITY DEFINER para evitar recursao

---

## 2. Edge Function: Webhook de Recebimento

### `supabase/functions/whatsapp-webhook/index.ts`

- Endpoint POST que a UAZAPI chama quando chega mensagem
- Sem JWT (webhook externo)
- Validacao por token secreto no header
- Logica:
  1. Recebe payload da UAZAPI (mensagem incoming)
  2. Identifica a instancia pelo token/instanceId
  3. Busca ou cria o contato na tabela `contacts`
  4. Busca ou cria a conversa na tabela `conversations`
  5. Insere a mensagem na tabela `conversation_messages`
  6. Atualiza `last_message_at` e marca `is_read = false`

### Adicionar action `send-chat` ao `uazapi-proxy`

Nova action no proxy existente para enviar mensagens individuais (texto e midia) a partir do chat do helpdesk.

---

## 3. Interface - Paginas e Componentes

### 3.1 Rota `/dashboard/helpdesk`

Pagina principal do helpdesk com layout em 3 colunas:

```text
+-------------------+-------------------+-------------------+
| Lista Conversas   | Chat / Mensagens  | Info do Contato   |
| (coluna esquerda) | (coluna central)  | (coluna direita)  |
|                   |                   |                   |
| - Filtros         | - Header conversa | - Nome            |
| - Busca           | - Lista mensagens | - Telefone        |
| - Cards conversa  | - Input envio     | - Etiquetas       |
|   com badge       |   texto/midia     | - Atribuicao      |
|   status/prioridade|                  | - Status/Prioridade|
+-------------------+-------------------+-------------------+
```

### 3.2 Componentes Novos

| Componente | Descricao |
|------------|-----------|
| `HelpDeskPage.tsx` | Pagina principal com layout 3 colunas |
| `ConversationList.tsx` | Lista lateral de conversas com filtros |
| `ConversationItem.tsx` | Card de cada conversa na lista |
| `ChatPanel.tsx` | Painel central de mensagens |
| `MessageBubble.tsx` | Bolha de mensagem (incoming/outgoing/nota) |
| `ChatInput.tsx` | Area de input com suporte a texto e midia |
| `ContactInfoPanel.tsx` | Painel lateral direito com info do contato |

### 3.3 Sidebar

Adicionar item "Atendimento" no menu lateral com icone `Headphones`.

### 3.4 Funcionalidades da Fase 1

- Listar conversas com filtro por status (aberta/pendente/resolvida)
- Visualizar mensagens de uma conversa em tempo real
- Enviar mensagens de texto via UAZAPI
- Marcar como lida ao abrir conversa
- Atribuir conversa a um usuario
- Alterar status e prioridade
- Notas privadas (fundo amarelo, apenas agentes veem)
- Badge de nao lidas no sidebar

### 3.5 Fora da Fase 1 (fases futuras)

- Envio/recepcao de audio, video, PDF
- Transcricao de audio
- Round-robin automatico
- Dashboard com KPIs
- Gestao de etiquetas
- Gestao de usuarios do helpdesk
- Transferencia entre agentes/equipes

---

## 4. Detalhes Tecnicos

### Realtime

```typescript
// Escutar novas mensagens em tempo real
supabase
  .channel('helpdesk-messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'conversation_messages',
  }, (payload) => { /* atualizar UI */ })
  .subscribe()
```

### Envio de mensagens

Reutilizar o `uazapi-proxy` existente com nova action `send-chat` que usa o endpoint `/send/text` da UAZAPI, enviando para o JID individual do contato.

### Funcao helper para RLS

```sql
CREATE OR REPLACE FUNCTION public.has_inbox_access(_user_id uuid, _inbox_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM inbox_users
    WHERE user_id = _user_id AND inbox_id = _inbox_id
  )
$$;
```

---

## Resumo de Arquivos

### Novos arquivos:
- `src/pages/dashboard/HelpDesk.tsx`
- `src/components/helpdesk/ConversationList.tsx`
- `src/components/helpdesk/ConversationItem.tsx`
- `src/components/helpdesk/ChatPanel.tsx`
- `src/components/helpdesk/MessageBubble.tsx`
- `src/components/helpdesk/ChatInput.tsx`
- `src/components/helpdesk/ContactInfoPanel.tsx`
- `supabase/functions/whatsapp-webhook/index.ts`

### Arquivos modificados:
- `src/App.tsx` - adicionar rota `/dashboard/helpdesk`
- `src/components/dashboard/Sidebar.tsx` - adicionar item "Atendimento"
- `supabase/functions/uazapi-proxy/index.ts` - adicionar action `send-chat`
- `supabase/config.toml` - registrar nova edge function

