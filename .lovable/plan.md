
# Plano: Adicionar Seleção de Participantes no Disparador

## Objetivo
Quando a opção "Não enviar para Admins/Donos" estiver ativa, exibir a lista de participantes (membros regulares) e permitir que o usuário selecione quais deles receberão a mensagem no privado.

---

## Comportamento Atual

Hoje, quando `excludeAdmins` está ativo:
1. O sistema coleta automaticamente **todos** os membros regulares (não-admin, não-superadmin) dos grupos selecionados
2. Faz a deduplicação (remove duplicatas por JID)
3. Envia para **todos** esses contatos únicos

## Novo Comportamento

Quando `excludeAdmins` estiver ativo:
1. Exibir uma **nova seção** abaixo do toggle mostrando todos os participantes elegíveis
2. Permitir que o usuário **selecione/desmarque** participantes individualmente
3. Oferecer botões de "Selecionar Todos" e "Limpar Seleção"
4. Adicionar busca por nome/número
5. Mostrar de qual grupo cada participante veio (primeira ocorrência)
6. O envio será feito apenas para os participantes **selecionados**

---

## Mudanças no Código

### Arquivo: `src/components/broadcast/BroadcastMessageForm.tsx`

**1. Adicionar novos estados para controle dos participantes**

```typescript
// Participantes selecionados para envio (JIDs)
const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
const [participantSearchTerm, setParticipantSearchTerm] = useState('');
```

**2. Criar função para obter lista de membros únicos com metadados**

```typescript
// Retorna membros únicos com informações do grupo de origem
const getUniqueRegularMembersWithInfo = () => {
  const seenJids = new Set<string>();
  const uniqueMembers: { 
    jid: string; 
    groupName: string; 
    displayName: string; // número formatado ou nome
  }[] = [];
  
  for (const group of selectedGroups) {
    const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin);
    for (const member of regularMembers) {
      if (!seenJids.has(member.jid)) {
        seenJids.add(member.jid);
        uniqueMembers.push({ 
          jid: member.jid, 
          groupName: group.name,
          displayName: formatPhoneNumber(member.jid) // ex: +55 11 99999-9999
        });
      }
    }
  }
  
  return uniqueMembers;
};
```

**3. Inicializar seleção quando excludeAdmins é ativado**

```typescript
// Quando excludeAdmins muda, inicializa todos como selecionados
useEffect(() => {
  if (excludeAdmins) {
    const uniqueMembers = getUniqueRegularMembersWithInfo();
    setSelectedParticipants(new Set(uniqueMembers.map(m => m.jid)));
  } else {
    setSelectedParticipants(new Set());
  }
}, [excludeAdmins, selectedGroups]);
```

**4. Adicionar UI de seleção de participantes (abaixo do toggle)**

Quando `excludeAdmins` estiver ativo, exibir:

```
┌───────────────────────────────────────────────────────────────┐
│ 👥 Participantes para envio                                   │
│                                                               │
│ [🔍 Buscar participante...]    [✓ Todos] [☐ Limpar]          │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Scroll Area (max-height: 250px)                         │  │
│ │                                                          │  │
│ │ ☑ +55 11 98765-4321                                     │  │
│ │   └ Casa Do Agricultor Vitória                          │  │
│ │                                                          │  │
│ │ ☑ +55 11 91234-5678                                     │  │
│ │   └ CDA | Consultório Vet                               │  │
│ │                                                          │  │
│ │ ☐ +55 21 99999-0000                                     │  │
│ │   └ Grupo Marketing                                     │  │
│ │                                                          │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ ℹ️ 45 de 67 participantes selecionados                       │
└───────────────────────────────────────────────────────────────┘
```

**5. Modificar lógica de envio**

Atualizar `handleSendText` e `handleSendMedia` para usar apenas os participantes selecionados:

```typescript
// Antes (envia para todos):
const uniqueMembers = getUniqueRegularMembers();

// Depois (envia apenas para selecionados):
const allUniqueMembers = getUniqueRegularMembersWithInfo();
const membersToSend = allUniqueMembers.filter(m => selectedParticipants.has(m.jid));
```

**6. Atualizar exibição de contagem**

O texto abaixo do toggle passa a mostrar quantos estão selecionados:

```typescript
<p className="text-xs text-muted-foreground">
  {excludeAdmins 
    ? `${selectedParticipants.size} de ${uniqueRegularMembersCount} contato(s) selecionado(s)`
    : `Enviará para ${selectedGroups.length} grupo(s)`
  }
</p>
```

---

## Função utilitária para formatar número

```typescript
const formatPhoneNumber = (jid: string): string => {
  // JID format: 5511987654321@s.whatsapp.net
  const number = jid.split('@')[0];
  if (!number || number.length < 10) return jid;
  
  // Format: +55 11 98765-4321
  const countryCode = number.slice(0, 2);
  const areaCode = number.slice(2, 4);
  const rest = number.slice(4);
  
  if (rest.length === 9) {
    return `+${countryCode} ${areaCode} ${rest.slice(0, 5)}-${rest.slice(5)}`;
  } else if (rest.length === 8) {
    return `+${countryCode} ${areaCode} ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  
  return `+${countryCode} ${areaCode} ${rest}`;
};
```

---

## Componentes UI Necessários

A seção de participantes usará componentes já existentes:
- `ScrollArea` - Para lista rolável
- `Checkbox` - Para seleção individual
- `Input` - Para busca
- `Button` - Para ações em lote
- `Badge` - Para contador

---

## Fluxo do Usuário

1. Usuário seleciona grupos no Step 2
2. Avança para Step 3 (Mensagem)
3. Ativa "Não enviar para Admins/Donos"
4. **Nova seção aparece** mostrando lista de participantes
5. Todos vêm pré-selecionados por padrão
6. Usuário pode:
   - Buscar por número
   - Desmarcar participantes específicos
   - Usar "Limpar" para desmarcar todos
   - Usar "Todos" para selecionar todos
7. Compõe a mensagem e envia
8. Apenas os participantes selecionados recebem

---

## Considerações de Performance

- **Virtualização**: Se a lista tiver muitos participantes (>100), considerar implementar virtualização. Inicialmente, o `ScrollArea` com altura fixa será suficiente para a maioria dos casos.
- **Memoização**: Usar `useMemo` para `getUniqueRegularMembersWithInfo()` evitando recálculo desnecessário.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/broadcast/BroadcastMessageForm.tsx` | Adicionar estados, UI de seleção e modificar lógica de envio |

---

## Benefícios

- **Controle granular**: Usuário pode excluir participantes específicos que não devem receber a mensagem
- **Transparência**: Mostra exatamente quem vai receber antes de enviar
- **Flexibilidade**: Permite enviar apenas para um subconjunto de membros
- **Busca rápida**: Facilita encontrar participantes específicos em listas grandes
