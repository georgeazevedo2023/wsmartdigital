
# Plano: Corrigir Exibição de Participantes (Número + PushName)

## Problema Identificado

Olhando seu screenshot, os números estão sendo exibidos incorretamente (ex: `+18 53 83690211520`) porque o sistema está usando o JID interno do WhatsApp ao invés do número de telefone real.

A UAZAPI retorna dois campos importantes que estamos ignorando:
- **PhoneNumber**: O número real do telefone (ex: `5511999999999@s.whatsapp.net`)
- **PushName**: O nome que a pessoa configurou no WhatsApp

Atualmente, o `GroupSelector.tsx` só captura `jid`, `isAdmin` e `isSuperAdmin`, descartando esses dados úteis.

---

## Solução

### 1. Atualizar a interface `Participant` no GroupSelector

Adicionar os campos `name` (pushname) e `phoneNumber`:

```typescript
export interface Participant {
  jid: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  name?: string;        // PushName do WhatsApp
  phoneNumber?: string; // Número real (quando disponível)
}
```

### 2. Atualizar o mapeamento de participantes no GroupSelector

Capturar PushName e PhoneNumber da resposta da UAZAPI:

```typescript
participants: rawParticipants.map((p: any) => ({
  jid: p.JID || p.jid || p.id || '',
  isAdmin: p.IsAdmin || p.isAdmin || false,
  isSuperAdmin: p.IsSuperAdmin || p.isSuperAdmin || false,
  name: p.PushName || p.pushName || p.DisplayName || p.Name || p.name || undefined,
  phoneNumber: p.PhoneNumber || p.phoneNumber || undefined,
})),
```

### 3. Atualizar ParticipantInfo no ParticipantSelector

Incluir o pushName na estrutura:

```typescript
interface ParticipantInfo {
  jid: string;
  displayName: string;  // Número formatado DDI+DDD+NUMERO
  pushName?: string;    // Nome do WhatsApp
  groupName: string;
}
```

### 4. Melhorar a função formatPhoneNumber

Reformular para o padrão DDI + DDD + NUMERO (sem traços ou espaços extras):

```typescript
const formatPhoneNumber = (value: string): string => {
  // Remove sufixos do WhatsApp e caracteres não numéricos
  const number = value.split('@')[0].replace(/\D/g, '');
  if (!number || number.length < 10) return value;
  
  // Formato simples: DDI + espaço + DDD + espaço + NUMERO
  // Ex: 5511999999999 -> 55 11 999999999
  const ddi = number.slice(0, 2);
  const ddd = number.slice(2, 4);
  const numero = number.slice(4);
  
  return `${ddi} ${ddd} ${numero}`;
};
```

### 5. Atualizar lógica de uniqueParticipants

Usar `phoneNumber` quando disponível, senão `jid`, e incluir o `name`:

```typescript
const uniqueParticipants = useMemo((): ParticipantInfo[] => {
  const seenJids = new Set<string>();
  const participants: ParticipantInfo[] = [];

  for (const group of selectedGroups) {
    const regularMembers = group.participants.filter(
      (p) => !p.isAdmin && !p.isSuperAdmin
    );
    for (const member of regularMembers) {
      if (!seenJids.has(member.jid)) {
        seenJids.add(member.jid);
        
        // Prioriza phoneNumber, senão usa jid
        const rawNumber = member.phoneNumber || member.jid;
        
        participants.push({
          jid: member.jid,
          displayName: formatPhoneNumber(rawNumber),
          pushName: member.name,
          groupName: group.name,
        });
      }
    }
  }

  return participants;
}, [selectedGroups]);
```

### 6. Atualizar UI para exibir PushName + Número

Mostrar o nome (se disponível) como título principal e o número abaixo:

```tsx
<div className="flex-1 min-w-0">
  {participant.pushName ? (
    <>
      <p className="text-sm font-medium truncate">{participant.pushName}</p>
      <p className="text-xs text-muted-foreground truncate">
        {participant.displayName} • {participant.groupName}
      </p>
    </>
  ) : (
    <>
      <p className="text-sm font-medium truncate">{participant.displayName}</p>
      <p className="text-xs text-muted-foreground truncate">
        {participant.groupName}
      </p>
    </>
  )}
</div>
```

### 7. Atualizar busca para incluir pushName

Permitir buscar tanto por número quanto por nome:

```typescript
const filteredParticipants = useMemo(() => {
  if (!searchTerm.trim()) return uniqueParticipants;

  const search = searchTerm.toLowerCase().replace(/[+\-\s]/g, '');
  return uniqueParticipants.filter((p) => {
    const normalizedPhone = p.displayName.replace(/[+\-\s]/g, '').toLowerCase();
    const normalizedGroup = p.groupName.toLowerCase();
    const normalizedName = (p.pushName || '').toLowerCase();
    return normalizedPhone.includes(search) || 
           normalizedGroup.includes(search) || 
           normalizedName.includes(search);
  });
}, [uniqueParticipants, searchTerm]);
```

---

## Resultado Visual Esperado

```
┌─────────────────────────────────────────────────┐
│ ☑ João Silva                                    │
│   55 11 999999999 • Casa Do Agricultor Vitória  │
├─────────────────────────────────────────────────┤
│ ☑ Maria Oliveira                                │
│   55 21 988888888 • CDA | Consultório Vet       │
├─────────────────────────────────────────────────┤
│ ☑ 55 31 977777777 (sem pushname)                │
│   Grupo Marketing                               │
└─────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/broadcast/GroupSelector.tsx` | Adicionar `name` e `phoneNumber` na interface e mapeamento |
| `src/components/broadcast/ParticipantSelector.tsx` | Atualizar interface, formatação, exibição e busca |

---

## Benefícios

- **Números corretos**: Exibe o número real do telefone, não IDs internos do WhatsApp
- **Formato limpo**: DDI + DDD + NUMERO sem formatação excessiva
- **Identificação fácil**: PushName aparece quando disponível, facilitando identificar quem é quem
- **Busca melhorada**: Pode buscar por nome ou número
