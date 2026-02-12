
# Corrigir Lista de Participantes Desaparecida e Permitir Envio para LIDs

## Problema
O enriquecimento automatico via `/group/info` esta SUBSTITUINDO todos os participantes do grupo pelos que tem PhoneNumber valido. Como `/group/info` tambem retorna numeros mascarados para contatos LID, o filtro remove a maioria dos participantes, resultando em "0 de 0 contatos" e "Nenhum membro regular encontrado".

Os logs confirmam: "Group xxx@g.us : 2 participants with valid phone" - apenas 2 de potencialmente dezenas de membros passam no filtro.

## Causa Raiz
1. A acao `resolve-lids` filtra participantes que nao tem PhoneNumber valido e retorna so os que tem
2. O frontend substitui TODOS os participantes pelos retornados (apenas 2), perdendo todos os outros
3. O `useEffect` que sincroniza `enrichedGroups` com `selectedGroups` pode causar loops de reset

## Solucao

### Abordagem: Enriquecer sem substituir + permitir envio para LIDs

Em vez de substituir todos os participantes, apenas ENRIQUECER os que puderem ser enriquecidos e MANTER os LIDs como estao. A API UAZAPI aceita envio para qualquer JID valido (incluindo `@lid`) atraves do campo `number` no `/send/text`.

### Secao Tecnica

**1. Reverter `enrichedGroups` em `BroadcastMessageForm.tsx`**
- Remover o estado `enrichedGroups` e a logica de `effectiveGroups`
- Voltar a passar `selectedGroups` diretamente ao `ParticipantSelector`
- Remover o prop `onParticipantsUpdated`
- Isso elimina o bug de substituicao total

**2. Modificar `resolve-lids` no proxy (`uazapi-proxy/index.ts`)**
- Retornar TODOS os participantes (incluindo os sem PhoneNumber valido)
- Para os que tem PhoneNumber valido, incluir o phone
- Para os que nao tem, retornar o JID original como identificador
- Isso permite que o frontend enriqueca os que puder sem perder ninguem

**3. Modificar `ParticipantSelector.tsx` - enriquecimento local sem callback**
- Em vez de chamar `onParticipantsUpdated`, manter o enriquecimento local no componente
- Criar um estado `enrichedMap` (Map de JID original -> dados enriquecidos)
- No `useMemo` de `uniqueParticipants`, aplicar o `enrichedMap` para substituir displayName e phone quando disponivel
- LID participants que nao foram enriquecidos continuam visiveis e selecionaveis

**4. Permitir envio para LIDs (`BroadcastMessageForm.tsx`)**
- Remover qualquer restricao que impeca envio para JIDs com `@lid`
- A funcao `sendToNumber` ja usa o JID diretamente no campo `number` do payload
- UAZAPI aceita `@lid` como destinatario valido - o gateway resolve internamente

**5. Melhorar exibicao de LIDs no `ParticipantSelector`**
- Em vez de "[Sem numero]", exibir o PushName como label principal
- Mostrar badge "LID" mas sem aviso/warning que impeca selecao
- Remover o botao "Buscar numeros" e o banner de warning que sugere que LIDs sao problematicos

**Arquivos modificados:**
- `src/components/broadcast/BroadcastMessageForm.tsx` (reverter enrichedGroups, voltar a usar selectedGroups direto)
- `src/components/broadcast/ParticipantSelector.tsx` (enriquecimento local, permitir LIDs, remover warning)
- `supabase/functions/uazapi-proxy/index.ts` (retornar todos participantes, nao so os com phone valido)
