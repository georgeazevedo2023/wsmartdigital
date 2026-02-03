
# Correção da Verificação de Números de WhatsApp

## Problema Diagnosticado

A verificação de números está falhando porque existe uma incompatibilidade entre o formato de resposta da UAZAPI e o código que a processa.

### Evidência dos Logs

A UAZAPI está retornando os dados corretamente (status 200):
```json
[{"query":"558196048149","isInWhatsapp":true,"jid":"558196048149@s.whatsapp.net",...}, ...]
```

Porém a edge function procura por `checkData?.Users` ou `checkData?.users`, mas o retorno é um **array direto**, não um objeto com propriedade `users`.

### Impacto

1. Todos os 546 números aparecem como "Erro" (badge amarelo)
2. Os contadores mostram "0 válidos" e "0 inválidos" porque nenhum lead tem status `valid` ou `invalid` - todos estão como `error`

---

## Solução

### Arquivo: `supabase/functions/uazapi-proxy/index.ts`

Modificar o case `check-numbers` (linhas 502-510) para detectar corretamente quando a resposta é um array direto:

**De:**
```typescript
// Normalize response - UAZAPI may return { Users: [...] } or other variations
const users = (checkData as Record<string, unknown>)?.Users || 
              (checkData as Record<string, unknown>)?.users || 
              (checkData as Record<string, unknown>)?.data || 
              []

return new Response(
  JSON.stringify({ users }),
  { status: checkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

**Para:**
```typescript
// Normalize response - UAZAPI returns array directly: [{query, isInWhatsapp, ...}, ...]
// Or wrapped in { Users: [...] } or { users: [...] } or { data: [...] }
let users: unknown[]
if (Array.isArray(checkData)) {
  // Direct array response
  users = checkData
  console.log('Check response is direct array with', users.length, 'items')
} else {
  // Try to extract from object wrapper
  users = (checkData as Record<string, unknown>)?.Users as unknown[] || 
          (checkData as Record<string, unknown>)?.users as unknown[] || 
          (checkData as Record<string, unknown>)?.data as unknown[] || 
          []
  console.log('Check response extracted from object, items:', users.length)
}

return new Response(
  JSON.stringify({ users }),
  { status: checkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

---

## Resultado Esperado

Após a correção:

| Antes | Depois |
|-------|--------|
| 0 válidos, 0 inválidos, todos como "Erro" | 540+ válidos, alguns inválidos (se houver) |
| Badge amarelo "Erro" em todos | Badge verde "WhatsApp" nos válidos |
| Toast: "0 válidos, 0 inválidos" | Toast: "543 válidos, 3 inválidos" (exemplo) |

---

## Observacoes Tecnicas

- O código no frontend (`LeadsBroadcaster.tsx`) já está correto - ele espera `response.data.users` e processa os campos `query`, `isInWhatsapp`, etc.
- Nenhuma alteração necessária no frontend
- A correção é apenas na edge function para normalizar a resposta da UAZAPI
