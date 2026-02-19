

# Fix: Análise de Inteligência falhando com erro 500

## Problema Identificado

Os logs da edge function mostram:
```
[analyze-summaries] Analyzing 8 conversations with AI...
[analyze-summaries] AI error: 500
```

O gateway de IA retornou erro 500. A causa principal e o que precisa ser corrigido:

1. **Modelo instavel**: O modelo `google/gemini-3-flash-preview` e um preview que pode retornar 500 intermitentemente
2. **Metodo de auth invalido**: `getClaims(token)` nao e um metodo padrao do Supabase JS client -- pode falhar silenciosamente em algumas versoes

---

## Correcoes

### 1. Trocar modelo de IA para um estavel

No arquivo `supabase/functions/analyze-summaries/index.ts`, linha 144:

- **De**: `google/gemini-3-flash-preview`
- **Para**: `google/gemini-2.5-flash`

Este modelo e estavel, rapido e adequado para a tarefa de analise de texto.

### 2. Corrigir autenticacao do usuario

Substituir `getClaims(token)` por `getUser(token)`, que e o metodo padrao:

```typescript
// De:
const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
const userId = claimsData.claims.sub;

// Para:
const { data: { user }, error: userError } = await userSupabase.auth.getUser(token);
const userId = user.id;
```

### 3. Adicionar log do erro completo do AI gateway

Para facilitar debug futuro, logar o body da resposta de erro:

```typescript
if (!aiResponse.ok) {
  const errBody = await aiResponse.text();
  console.error("[analyze-summaries] AI error:", aiResponse.status, errBody);
  // ...resto do tratamento
}
```

---

## Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/analyze-summaries/index.ts` | Trocar modelo para `gemini-2.5-flash`, corrigir auth com `getUser`, melhorar log de erro |

