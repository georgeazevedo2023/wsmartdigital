
# Corrigir Numeros Mascarados - Enriquecimento Automatico via /group/info

## Problema Real
A correcao anterior tentava cruzar LIDs com participantes de `/group/info` pelo campo JID. Porem, `/group/info` retorna participantes com JIDs no formato `numero@s.whatsapp.net`, enquanto os LIDs sao no formato `xxx@lid`. Como os identificadores sao completamente diferentes, o cruzamento (`lidSet.has(pLidKey)`) nunca encontra correspondencia e nenhum numero e resolvido.

## Solucao
Em vez de tentar cruzar LIDs com phone numbers depois, buscar automaticamente os dados completos de `/group/info` para cada grupo selecionado e SUBSTITUIR os participantes mascarados pelos dados reais. O `/group/info` retorna participantes com PhoneNumber real - basta usar esses dados diretamente.

### Secao Tecnica

**1. Modificar `supabase/functions/uazapi-proxy/index.ts` - acao `resolve-lids`**

Mudar a estrategia: em vez de cruzar por LID key, retornar TODOS os participantes com PhoneNumber valido de cada grupo. O frontend fara a substituicao completa dos dados de participantes.

```
case 'resolve-lids': {
  const groupJids = body.groupJids || []
  
  // Para cada grupo, buscar info completa
  const groupParticipants: Record<string, Array<{jid, phone, name}>> = {}
  
  for (const gjid of groupJids) {
    const infoData = await fetch(.../group/info, {groupjid: gjid})
    const participants = infoData.Participants || []
    
    // Retornar TODOS os participantes com phone valido
    groupParticipants[gjid] = participants
      .filter(p => p.PhoneNumber && !p.PhoneNumber.includes('·'))
      .map(p => ({
        jid: p.JID,
        phone: p.PhoneNumber.replace(/\D/g, ''),
        name: p.PushName,
        isAdmin: p.IsAdmin,
        isSuperAdmin: p.IsSuperAdmin,
      }))
  }
  
  return { groupParticipants }
}
```

**2. Modificar `src/components/broadcast/ParticipantSelector.tsx` - `handleResolveLids`**

Ao receber os dados do proxy, substituir completamente os participantes de cada grupo selecionado com os dados enriquecidos do `/group/info`, em vez de tentar cruzar por LID.

```
// Receber dados completos por grupo
const { groupParticipants } = data

// Para cada grupo, substituir participantes com dados enriquecidos
const updatedGroups = selectedGroups.map(group => {
  const enrichedParticipants = groupParticipants[group.id]
  if (!enrichedParticipants) return group
  
  return {
    ...group,
    participants: enrichedParticipants.map(p => ({
      jid: `${p.phone}@s.whatsapp.net`,
      phoneNumber: p.phone,
      name: p.name,
      isAdmin: p.isAdmin,
      isSuperAdmin: p.isSuperAdmin,
    })),
  }
})
```

**3. Tornar o enriquecimento automatico**

Remover a necessidade do botao "Buscar numeros" quando possivel: ao selecionar grupos que contenham participantes LID, disparar automaticamente a busca de `/group/info`. O botao permanece como fallback manual.

**Arquivos modificados:**
- `supabase/functions/uazapi-proxy/index.ts` (acao resolve-lids - retornar todos participantes por grupo)
- `src/components/broadcast/ParticipantSelector.tsx` (substituir participantes com dados enriquecidos + auto-trigger)
