
# Enviar status_ia="ligada" ao clicar em Ativar IA

## Situacao atual

A Edge Function `activate-ia` envia `status_ia: "ligar"` para o webhook. O usuario quer que envie `status_ia: "ligada"` em vez disso.

## Alteracao

### `supabase/functions/activate-ia/index.ts` (linha 28)

Trocar o valor enviado de `"ligar"` para `"ligada"`:

De:
```json
{ "status_ia": "ligar", "chatid": "...", "phone": "...", "instanceId": "..." }
```

Para:
```json
{ "status_ia": "ligada", "chatid": "...", "phone": "...", "instanceId": "..." }
```

## Arquivo afetado

- `supabase/functions/activate-ia/index.ts` - apenas 1 palavra alterada na linha 28
