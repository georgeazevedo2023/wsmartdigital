## Diagnóstico — por que as 4 de 4 falharam

A imagem mostra "0 sucesso / 4 falhas". A causa é uma **regressão do refactor de segurança** anterior:

1. O frontend (`useLeadMessageForm.ts`, `useBroadcastSend.ts`, hooks de grupo, etc.) foi atualizado para **não enviar mais o `token`** no body — agora envia apenas `instanceId`.
2. O edge function `supabase/functions/uazapi-proxy/index.ts` **não foi atualizado**: ainda lê `token` / `instanceToken` do body, nunca chama `getInstanceToken(instanceId)`.
3. Resultado: `ctx.instanceToken` fica `undefined` → `requireToken()` em cada handler retorna `400 "Instance token required"` → toda mensagem falha.

Conforme a documentação UAZAPI (`docs.uazapi.com`), `POST /send/text` exige header `token: <instance-token>`. Sem ele, nenhum envio funciona — o que bate exatamente com 4/4 falhas.

Há também campos do `HandlerContext` declarados mas nunca preenchidos no `index.ts` (`userId`, `isSuperAdmin`, `accessibleInstanceIds`, `instanceId`), o que deixa o controle de acesso por instância incompleto.

## Correção

### 1. `supabase/functions/uazapi-proxy/index.ts`
- Ler `instanceId` do body.
- Resolver o token via `getInstanceToken(instanceId)` (já existe em `_shared/supabase-admin.ts`).
- Validar que o usuário tem acesso àquela instância usando `getAccessibleInstanceIds(userId, isSuperAdmin)` — retornar **403** se não tiver.
- Preencher o `HandlerContext` completo (`instanceId`, `instanceToken`, `userId`, `isSuperAdmin`, `accessibleInstanceIds`).
- Manter compatibilidade temporária: se ainda vier `token` no body (chamadas legadas) e não houver `instanceId`, usar o token recebido — mas logar um warning.

### 2. Handlers (`_shared/uazapi-handlers/*.ts`)
- Nenhuma mudança de comportamento. `requireToken` continua válido pois agora o token é resolvido server-side.

### 3. Verificação
- Após a correção, reenviar mensagem de teste pelo Disparador de Leads.
- Conferir `supabase--edge_function_logs uazapi-proxy` para garantir 200 e ausência de "Instance token required".

## O que NÃO muda
- Schema do banco, RLS, tabela `instance_secrets`, UI do Disparador, lógica de delay anti-bloqueio, formato de payload UAZAPI (`/send/text`, `/send/media`, etc.). É apenas religar o token no servidor.
