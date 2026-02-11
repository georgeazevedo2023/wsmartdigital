
# Corrigir Sincronizacao de Conversas - Endpoints UAZAPI Corretos

## Problema Identificado

A edge function `sync-conversations` esta usando endpoints incorretos da UAZAPI. Os logs mostram que TODOS os endpoints tentados retornam 404 ou 405:
- `/chat/fetchChats` -> 405 Method Not Allowed
- `/chat/getChats` -> 405 Method Not Allowed  
- `/chat/search` -> 404 Not Found
- `/chat/list` -> 405/404

## Causa Raiz

Consultando a documentacao oficial da UAZAPI V2 (https://docs.uazapi.com), o endpoint correto para buscar chats e:

```text
POST /chat/find
```

Com body contendo filtros como:
- `wa_isGroup` (boolean) - filtrar grupos vs individuais
- `limit` (integer) - quantidade de resultados
- `sort` (string) - ordenacao, ex: `-wa_lastMsgTimestamp`
- `offset` (integer) - paginacao

Os campos de resposta usam prefixo `wa_`:
- `wa_chatid` - JID do chat (ex: `5585999999999@s.whatsapp.net`)
- `wa_contactName` - Nome do contato
- `wa_name` - Nome alternativo
- `wa_fastid` - ID rapido
- `wa_lastMsgTimestamp` - Timestamp da ultima mensagem

Para buscar mensagens de um chat, o endpoint provavel e `POST /message/find` com filtros similares.

---

## Plano de Correcao

### 1. Atualizar Edge Function `sync-conversations/index.ts`

**Substituir** a logica de endpoint probing por uma chamada direta ao endpoint correto:

```text
POST /chat/find
Headers: { token: instanceToken, Content-Type: application/json }
Body: { 
  wa_isGroup: false, 
  limit: 200, 
  sort: "-wa_lastMsgTimestamp" 
}
```

**Mapear campos da resposta** com prefixo `wa_`:
- `wa_chatid` ou `wa_fastid` -> jid do contato
- `wa_contactName` ou `wa_name` -> nome do contato  
- `wa_lastMsgTimestamp` -> timestamp da ultima mensagem

### 2. Atualizar busca de mensagens

Substituir `POST /chat/messages` por `POST /message/find` com filtro:

```text
POST /message/find
Headers: { token: instanceToken }
Body: { wa_chatid: "5585999999999@s.whatsapp.net", limit: 30, sort: "-wa_timestamp" }
```

### 3. Adicionar logging detalhado

Logar a resposta completa do `/chat/find` para confirmar o formato exato dos dados retornados e ajustar o mapeamento se necessario.

---

## Arquivos Modificados

- `supabase/functions/sync-conversations/index.ts` - Corrigir endpoints e mapeamento de campos

## Resultado Esperado

Ao clicar em "Sincronizar", a funcao vai:
1. Chamar `POST /chat/find` com `wa_isGroup: false`
2. Receber a lista de chats individuais
3. Criar contatos e conversas no banco
4. Buscar mensagens recentes de cada chat
5. Popular a tela de atendimento com as conversas existentes
