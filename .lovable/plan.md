
# Fix: Outros agentes não aparecem no seletor de Agente Responsável

## Causa Raiz

A função `fetchAgentNames` no `HelpDesk.tsx` faz a seguinte query:
```typescript
supabase.from('user_profiles').select('id, full_name')
```

Porém a política RLS atual da tabela `user_profiles` tem apenas:
- `Users can view own profile` — `USING (auth.uid() = id)` 
- `Super admin can view all profiles` — só para super admins

Isso significa que **Milena consegue ler apenas o próprio perfil**. Bruno não aparece no `agentNamesMap`. O `ContactInfoPanel` encontra o `user_id` do Bruno via `inbox_users` (essa query funciona), mas ao tentar resolver o nome via `agentNamesMap[brunoid]` retorna `undefined` — exibindo um UUID truncado ou não exibindo corretamente.

A opção "Nenhum" já existe no código (`__none__`), então o botão de remover atribuição já funciona quando a lista está correta.

## Solução

### 1. Migração de banco de dados (única mudança necessária)

Adicionar uma nova política RLS em `user_profiles` que permite que membros de uma mesma inbox vejam os perfis uns dos outros:

```sql
CREATE POLICY "Inbox members can view co-member profiles"
ON public.user_profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM inbox_users iu1
    JOIN inbox_users iu2 ON iu1.inbox_id = iu2.inbox_id
    WHERE iu1.user_id = auth.uid()
    AND iu2.user_id = user_profiles.id
  )
);
```

**Como funciona:** Milena (autenticada) pode ver o perfil de Bruno se ambos compartilham pelo menos uma inbox na tabela `inbox_users`. Nenhuma alteração de código é necessária.

## Impacto nos Arquivos

- **`supabase/migrations/`**: Nova migração com a política RLS
- **Nenhum arquivo de código precisa ser modificado** — o `fetchAgentNames`, `agentNamesMap` e `ContactInfoPanel` já estão implementados corretamente. Só faltava o banco liberar a leitura dos co-membros.

## Resultado Esperado

Após a migração:
- `agentNamesMap` terá os nomes de **todos os agentes** da inbox (Milena, Bruno, etc.)
- O dropdown "Agente Responsável" exibirá todos os agentes por nome
- A opção "Nenhum" (que já existe) permitirá remover a atribuição
- A auto-atribuição ao responder continuará funcionando normalmente via broadcast
