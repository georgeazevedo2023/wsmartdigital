
# Corrigir Numeros Nao Aparecendo em Participantes LID

## Problema
Alguns contatos na lista de participantes aparecem como "+55 · · · · · · · · 41" com badge "LID" e "[Sem numero]", enquanto outros exibem o numero completo. Isso acontece porque o endpoint `/group/list` da API retorna o campo `PhoneNumber` mascarado (com pontos de privacidade) ou vazio para certos contatos que usam LID (Linked Device ID).

## Causa Raiz
1. O endpoint `/group/list` (acao `groups` no proxy) retorna dados de participantes com `PhoneNumber` mascarado ou ausente para contatos LID
2. O botao "Buscar numeros" usa a acao `resolve-lids` que chama `/chat/check` - endpoint nao confiavel para resolver LIDs
3. O endpoint `/group/info` (acao `group-info` ja existente) e o mais confiavel para obter `PhoneNumber` real dos membros

## Solucao
Alterar a acao `resolve-lids` no proxy para usar `/group/info` em vez de `/chat/check`, buscando os numeros reais dos participantes a partir dos grupos selecionados.

### Secao Tecnica

**1. Modificar `supabase/functions/uazapi-proxy/index.ts` - acao `resolve-lids`**
- Em vez de enviar LIDs para `/chat/check`, receber tambem os group JIDs no payload
- Para cada grupo, chamar `/group/info` que retorna participantes com `PhoneNumber` real
- Cruzar os LIDs recebidos com os participantes retornados pelo `/group/info`
- Retornar o mapeamento LID -> PhoneNumber real

Logica simplificada:
```
// Receber groupJids junto com lids
const { lids, groupJids } = body

// Para cada grupo, buscar info completa
for (const gjid of groupJids) {
  const resp = await fetch(`${uazapiUrl}/group/info`, {
    method: 'POST',
    headers: { 'token': instanceToken },
    body: JSON.stringify({ groupjid: gjid }),
  })
  // Extrair PhoneNumber dos participantes e cruzar com LIDs
}
```

**2. Modificar `src/components/broadcast/ParticipantSelector.tsx` - `handleResolveLids`**
- Enviar os JIDs dos grupos selecionados junto com os LIDs na requisicao
- Isso permite que o proxy use `/group/info` para resolver os numeros

Mudanca no body da requisicao:
```
body: JSON.stringify({
  action: 'resolve-lids',
  token: instance.token,
  lids: lids,
  groupJids: selectedGroups.map(g => g.id),  // NOVO
})
```

**3. Melhorar `src/components/broadcast/GroupSelector.tsx` - fallback de PushName**
- Quando `PhoneNumber` estiver vazio mas `PushName` contiver digitos que parecem um numero de telefone (10+ digitos apos limpeza), usar o PushName como fonte do numero
- Isso captura casos onde o numero mascarado "+55····41" nao e util mas o PushName pode conter o numero real

**Arquivos modificados:**
- `supabase/functions/uazapi-proxy/index.ts` (acao resolve-lids)
- `src/components/broadcast/ParticipantSelector.tsx` (enviar groupJids)
- `src/components/broadcast/GroupSelector.tsx` (fallback PushName)
