

# Corrigir Formatacao de Numeros no ParticipantSelector

## Problema Identificado

O numero `29570900168819` que aparece formatado como "29 57 0900168819" nao e um numero de telefone real - e um **LID (Linked Device ID)** interno do WhatsApp. Alguns participantes retornam apenas esse LID e nao possuem `PhoneNumber`.

A UAZAPI retorna participantes com dois campos importantes:
- **PhoneNumber**: O numero real do WhatsApp (ex: `5581994460365@s.whatsapp.net`)
- **JID/LID**: ID interno do WhatsApp (ex: `29570900168819@lid`)

O codigo atual esta usando `member.jid` como fonte principal, mas deveria priorizar `PhoneNumber`.

---

## Solucao em 3 Partes

### Parte 1: Priorizar PhoneNumber no GroupSelector

Modificar o mapeamento de participantes em `GroupSelector.tsx` para sempre priorizar `PhoneNumber` sobre `JID`.

**Arquivo:** `src/components/broadcast/GroupSelector.tsx`
**Linhas:** 95-101

```typescript
// De:
participants: rawParticipants.map((p: any) => ({
  jid: p.JID || p.jid || p.id || '',
  ...
  phoneNumber: p.PhoneNumber || p.phoneNumber || undefined,
})),

// Para:
participants: rawParticipants.map((p: any) => {
  // PhoneNumber e o numero real, JID pode ser LID interno
  const phoneNumber = p.PhoneNumber || p.phoneNumber || '';
  const jid = p.JID || p.jid || p.id || '';
  
  return {
    jid: phoneNumber || jid, // Prioriza PhoneNumber como identificador
    phoneNumber: phoneNumber,
    isAdmin: p.IsAdmin || p.isAdmin || false,
    isSuperAdmin: p.IsSuperAdmin || p.isSuperAdmin || false,
    name: p.PushName || p.pushName || p.DisplayName || p.Name || p.name || undefined,
  };
}),
```

### Parte 2: Atualizar ParticipantSelector para usar PhoneNumber

Modificar `ParticipantSelector.tsx` para:
1. Usar `member.phoneNumber` como fonte primaria para exibicao
2. Formatar apenas numeros que comecam com 55
3. Exibir indicador visual quando so houver LID (sem numero real)

**Arquivo:** `src/components/broadcast/ParticipantSelector.tsx`
**Linhas:** 26-43 e 66-75

```typescript
// Formatacao atualizada
const formatPhoneNumber = (value: string): string => {
  const number = value.split('@')[0].replace(/\D/g, '');
  if (!number || number.length < 10) return value;
  
  // So formata se comecar com 55 (Brasil)
  if (number.startsWith('55') && number.length >= 12 && number.length <= 13) {
    const ddi = number.slice(0, 2); // 55
    const ddd = number.slice(2, 4); // DDD
    const numero = number.slice(4); // Numero
    return `${ddi} ${ddd} ${numero}`;
  }
  
  // Outros numeros: apenas digitos
  return number;
};

// Verificar se e LID
const isLidOnly = (member: Participant): boolean => {
  const jid = member.jid || '';
  return jid.includes('@lid') && !member.phoneNumber;
};

// Ao montar participantes, usar phoneNumber quando disponivel
participants.push({
  jid: member.jid,
  displayName: member.phoneNumber 
    ? formatPhoneNumber(member.phoneNumber) 
    : formatPhoneNumber(member.jid),
  pushName: member.name,
  groupName: group.name,
  isLidOnly: !member.phoneNumber && member.jid.includes('@lid'),
});
```

### Parte 3: Buscar PhoneNumber para LIDs (Endpoint Extra)

Adicionar uma action `resolve-lid` no `uazapi-proxy` para buscar o PhoneNumber de participantes que so possuem LID. Essa busca sera opcional e sob demanda.

**Arquivo:** `supabase/functions/uazapi-proxy/index.ts`
**Nova action:** `resolve-lid`

Essa busca usara o endpoint `/chat/check` da UAZAPI para verificar/resolver os LIDs.

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/broadcast/GroupSelector.tsx` | Priorizar PhoneNumber no mapeamento de participantes |
| `src/components/broadcast/ParticipantSelector.tsx` | Usar phoneNumber como fonte primaria, formatar so 55, indicar LIDs |
| `supabase/functions/uazapi-proxy/index.ts` | Adicionar action `resolve-lid` para buscar PhoneNumber de LIDs |

---

## Interface Atualizada

```text
Participantes para envio                           3 de 5 selecionado(s)

[x] Joao Silva                                     <-- PushName
    55 81 994460365 • Grupo Vendas                 <-- PhoneNumber formatado

[x] Maria Santos
    55 81 993856099 • Grupo Marketing

[ ] Participante Desconhecido                      <-- Sem PushName
    [Sem numero] • Grupo Vendas                    <-- Indicador visual de LID
```

---

## Comportamento Esperado

1. **Numeros brasileiros (55)**: Formatados como `55 81 994460365`
2. **Numeros internacionais**: Exibidos apenas como digitos `14155552671`
3. **Participantes so com LID**: Exibidos com indicador "[Sem numero]" e opcao de buscar
4. **Botao "Buscar numeros"**: Aparece quando ha LIDs, chama o endpoint para resolver

