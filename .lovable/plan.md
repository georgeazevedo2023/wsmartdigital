

# Enviar payload completo ao ativar IA via webhook de outgoing

## Situacao atual

A funcao `activate-ia` envia um payload simplificado (`status_ia`, `chatid`, `phone`, `instanceId`) diretamente para o webhook. O usuario quer que o payload siga o mesmo modelo usado pelo `fire-outgoing-webhook` no `ChatInput`, com todos os metadados (timestamp, nomes, IDs, agente, etc.), usando `status_ia: "ligar"` e `pausar_agente: "nao"`.

## Solucao

Alterar o `ChatPanel.tsx` para parar de chamar a Edge Function `activate-ia` e, em vez disso, usar a mesma `fire-outgoing-webhook` ja usada pelo `ChatInput`, montando o payload completo com os dados dinamicos da conversa.

## Alteracoes

### 1. `src/components/helpdesk/ChatPanel.tsx` - funcao `handleActivateIA` (linhas 141-177)

Reescrever para:
1. Buscar o `webhook_outgoing_url` da inbox
2. Buscar o nome do agente logado (via `user_profiles`)
3. Buscar o nome da instancia (via `instances`)
4. Chamar `fire-outgoing-webhook` com o payload completo

O payload enviado sera:
```json
{
  "timestamp": "2026-02-17T00:04:51.126-03:00",
  "instance_name": "NeoBlindados",
  "instance_id": "rdef65c48caa3c9",
  "inbox_name": "Neo Blindados - Geral",
  "inbox_id": "79575754-...",
  "contact_name": "George",
  "remotejid": "558193856099@s.whatsapp.net",
  "fromMe": true,
  "agent_name": "George Azevedo",
  "agent_id": "66de650f-...",
  "pausar_agente": "nao",
  "status_ia": "ligar",
  "message_type": "text",
  "message": null,
  "media_url": null
}
```

Os valores fixos sao `pausar_agente: "nao"` e `status_ia: "ligar"`. Todos os outros sao dinamicos, obtidos da conversa, inbox, instancia e agente logado.

### 2. `src/components/helpdesk/ChatPanel.tsx` - imports

Adicionar import de `nowBRISO` de `@/lib/dateUtils` (mesma funcao usada no ChatInput para timestamp no fuso BR).

Adicionar import de `useAuth` ou usar `supabase.auth.getUser()` para obter o ID do agente logado.

### 3. Edge Function `activate-ia` permanece sem alteracao

A funcao `activate-ia` nao sera mais chamada pelo botao "Ativar IA" - sera substituida pelo `fire-outgoing-webhook`. A funcao pode ser mantida como esta para outros usos futuros ou removida posteriormente.

## Arquivos afetados

- `src/components/helpdesk/ChatPanel.tsx` - reescrever `handleActivateIA` para usar `fire-outgoing-webhook` com payload completo
