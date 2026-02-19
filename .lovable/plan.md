

# Fix: Adicionar retry e fallback no analyze-summaries

## Problema

O gateway de IA retorna `500 internal_server_error` mesmo com o modelo `google/gemini-2.5-flash`. O erro nao tem detalhes, o que indica problema temporario do gateway ou payload muito grande (8 conversas concatenadas).

## Correcoes

### No arquivo `supabase/functions/analyze-summaries/index.ts`:

**1. Adicionar funcao de retry com backoff**

Criar uma funcao helper que tenta a chamada ate 3 vezes com delay crescente (1s, 2s, 4s). Se `gemini-2.5-flash` falhar todas as tentativas, tenta uma vez com `google/gemini-2.5-flash-lite` como fallback (modelo mais leve, menos chance de timeout).

**2. Limitar o tamanho do payload**

Truncar cada resumo a no maximo 500 caracteres para evitar que o payload total fique muito grande e cause timeout no gateway.

**3. Remover `temperature` do request**

O parametro `temperature: 0.2` pode nao ser suportado por todos os modelos no gateway. Remover para usar o default.

### Logica de retry (pseudocodigo):

```
para tentativa de 1 ate 3:
  chamar gateway com gemini-2.5-flash
  se ok: retornar resultado
  se 429/402: retornar erro ao usuario (sem retry)
  se 500: esperar (tentativa * 1000ms) e tentar de novo

se todas falharam:
  tentar 1x com gemini-2.5-flash-lite
  se ok: retornar resultado
  se erro: retornar erro ao usuario
```

## Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/analyze-summaries/index.ts` | Adicionar retry com backoff, fallback para flash-lite, truncar resumos, remover temperature |

