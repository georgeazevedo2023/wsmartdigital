
# Sincronizar Conversas do WhatsApp para o Helpdesk

## Problema

A tela de atendimento esta vazia porque o sistema so registra conversas quando o webhook recebe mensagens novas. As conversas existentes no WhatsApp da instancia "motorac" nunca foram importadas para o banco de dados.

## Solucao

Criar um fluxo de sincronizacao que busca os chats existentes na UAZAPI (via `POST /chat/search`) e os importa para o banco de dados, criando contatos e conversas automaticamente. Tambem adicionar um botao "Sincronizar" na interface do helpdesk.

---

## 1. Nova action `sync-chats` no uazapi-proxy

Adicionar uma nova action na edge function `uazapi-proxy` que:

1. Chama `POST /chat/search` da UAZAPI com o token da instancia para obter a lista de chats individuais (excluindo grupos `@g.us`)
2. Retorna os chats para o frontend processar

---

## 2. Nova Edge Function `sync-conversations`

Criar uma edge function dedicada que recebe o `inbox_id` e executa o fluxo completo:

1. Busca a inbox e a instancia vinculada (com token)
2. Chama `POST /chat/search` da UAZAPI para listar todos os chats
3. Para cada chat individual (nao grupo):
   - Faz upsert do contato na tabela `contacts` (jid, phone, name)
   - Verifica se ja existe conversa aberta/pendente para este contato nesta inbox
   - Se nao existir, cria nova conversa com status "aberta"
   - Busca as ultimas mensagens do chat via UAZAPI (`POST /chat/messages` ou endpoint equivalente)
   - Insere as mensagens na tabela `conversation_messages` (evitando duplicatas via `external_id`)
4. Retorna contagem de conversas sincronizadas

**Endpoint**: `POST /functions/v1/sync-conversations`
**Body**: `{ inbox_id: string }`
**Auth**: JWT do usuario (verificado)

---

## 3. Modificacoes na Interface

### 3.1 HelpDesk.tsx

- Adicionar seletor de inbox no topo (quando o usuario tem acesso a mais de uma)
- Filtrar conversas pela inbox selecionada
- Adicionar botao "Sincronizar" que chama a edge function `sync-conversations`
- Mostrar loading durante a sincronizacao

### 3.2 ConversationList.tsx

- Adicionar botao de sync no header (icone RefreshCw)
- Exibir contador de conversas

---

## 4. Configuracao

### Nova Edge Function no config.toml:
```
[functions.sync-conversations]
verify_jwt = false
```

(JWT sera verificado internamente pela funcao)

---

## 5. Fluxo de Dados

```text
Usuario clica "Sincronizar"
  -> Frontend chama sync-conversations(inbox_id)
  -> Edge Function busca inbox -> instance -> token
  -> Chama UAZAPI POST /chat/search (token da instancia)
  -> Filtra chats individuais (sem @g.us)
  -> Para cada chat:
     -> Upsert contato em contacts
     -> Upsert conversa em conversations
     -> Busca mensagens recentes via UAZAPI
     -> Insert mensagens em conversation_messages
  -> Retorna { synced: N }
  -> Frontend atualiza lista de conversas
```

---

## 6. Detalhes Tecnicos

### Endpoint UAZAPI para listar chats:
```
POST /chat/search
Header: token: <instance_token>
Body: { "count": 100, "type": "individual" }
```

### Endpoint UAZAPI para buscar mensagens de um chat:
```
POST /chat/messages  (ou GET /chat/messages?jid=...)
Header: token: <instance_token>
Body: { "chatjid": "5585999999999@s.whatsapp.net", "count": 50 }
```

### Prevencao de duplicatas:
- Contatos: upsert por `jid` (coluna unique)
- Conversas: busca por `inbox_id + contact_id + status IN (aberta, pendente)`
- Mensagens: verificar `external_id` antes de inserir

---

## 7. Arquivos

### Novos:
- `supabase/functions/sync-conversations/index.ts`

### Modificados:
- `src/pages/dashboard/HelpDesk.tsx` (seletor inbox + botao sync)
- `src/components/helpdesk/ConversationList.tsx` (botao sync no header)
- `supabase/functions/uazapi-proxy/index.ts` (action `sync-chats` opcional)
