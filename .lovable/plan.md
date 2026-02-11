
# Corrigir Sincronizacao e Distribuicao de Mensagens

## Problema Raiz Identificado

A analise dos logs revela dois problemas criticos:

### 1. `/message/find` ignora o filtro `wa_chatid`
Todas as chamadas retornam os MESMOS dados (~516KB, 30 mensagens), independentemente do telefone passado. A primeira conversa processada recebe todas as mensagens, as demais ficam vazias porque o `external_id` ja existe no banco.

Exemplo dos logs:
```text
/message/find for 558199820455 -> chatid: "558193856099@s.whatsapp.net" (ERRADO!)
/message/find for 558181359533 -> chatid: "558193856099@s.whatsapp.net" (ERRADO!)
/message/find for 558193856099 -> chatid: "558193856099@s.whatsapp.net" (correto)
```

### 2. Sincronizacao manual incomoda
O usuario precisa clicar no botao de sync toda vez que abre o helpdesk.

---

## Solucao

### 1. Filtrar mensagens pelo `chatid` no lado do servidor

Ja que o endpoint `/message/find` retorna todas as mensagens da instancia ignorando filtros, a solucao e:

1. Chamar `/message/find` apenas UMA VEZ (limit: 500+) para trazer todas as mensagens recentes
2. Agrupar as mensagens no servidor pelo campo `chatid` de cada mensagem
3. Para cada conversa, inserir apenas as mensagens cujo `chatid` corresponde ao JID do contato

Isso elimina o problema de mensagens cruzadas e tambem reduz drasticamente o numero de chamadas a API (de N chamadas para 1 unica).

### 2. Corrigir mapeamento de campos

A resposta real da UAZAPI V2 usa:
- `messages` (array dentro do objeto)
- `chatid` (nao `wa_chatid`)
- `content.text` (nao `wa_body`)
- `fromMe` (nao `wa_fromMe`)
- `id` ou `_id` para ID da mensagem
- `timestamp` para data

### 3. Sincronizacao automatica ao abrir o Helpdesk

Em vez de depender do botao manual:
- Auto-sync ao selecionar uma inbox (primeira vez na sessao)
- Sync silencioso em background (sem bloquear a interface)
- Manter o botao manual como opcao secundaria
- O webhook ja trata mensagens em tempo real

---

## Arquivos a Modificar

### `supabase/functions/sync-conversations/index.ts`
- Buscar mensagens UMA unica vez com limit alto (500)
- Agrupar mensagens por `chatid` (campo real da resposta)
- Para cada conversa, inserir apenas mensagens do `chatid` correspondente
- Mapear campos corretos: `content.text`, `fromMe`, `timestamp`, `chatid`
- Logar a distribuicao de mensagens por chat para debug

### `src/pages/dashboard/HelpDesk.tsx`
- Adicionar auto-sync quando o usuario seleciona uma inbox
- Executar em background sem bloquear a interface
- Controlar com flag para nao re-sincronizar desnecessariamente

---

## Detalhes Tecnicos

### Nova logica de sync (pseudo-codigo)

```text
1. Buscar chats: POST /chat/find (wa_isGroup: false)
2. Buscar TODAS as mensagens: POST /message/find (limit: 500)
3. Resposta real: { messages: [ { chatid, content: {text}, fromMe, timestamp, id, ... } ] }
4. Agrupar: messagesByChat = Map<chatid, mensagens[]>
5. Para cada chat:
   - Upsert contato (jid = chat.wa_chatid)
   - Upsert conversa
   - Buscar mensagens de messagesByChat[jid]
   - Inserir apenas as que correspondem (external_id dedup)
```

### Mapeamento de campos correto (baseado nos logs reais)

| Campo na resposta | Uso no sistema |
|---|---|
| `chatid` | JID do contato (ex: `558193856099@s.whatsapp.net`) |
| `content.text` | Conteudo da mensagem |
| `fromMe` | Direcao (outgoing vs incoming) |
| `timestamp` | Data/hora da mensagem |
| `id` ou `_id` | external_id para deduplicacao |
| `fileURL` | URL de midia |
| `type` | Tipo de midia |

### Auto-sync no frontend

```text
useEffect ao mudar inbox:
  - Se ja sincronizou esta inbox nesta sessao, pular
  - Chamar sync-conversations em background
  - Marcar inbox como sincronizada
  - Atualizar lista de conversas ao concluir
```
