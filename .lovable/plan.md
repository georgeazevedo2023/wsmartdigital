

# Plano: Adicionar Funcionalidade "Excluir Admins" ao Editor de Carrossel

## Objetivo
Integrar ao editor de carrossel a mesma funcionalidade de "Não enviar para Admins/Donos" que já existe nas abas de texto e mídia, permitindo envio individual para participantes selecionados.

---

## Situação Atual

A funcionalidade de exclusão de admins com seleção de participantes já existe e está implementada no `BroadcastMessageForm.tsx`:
- Toggle "Não enviar para Admins/Donos"
- Componente `ParticipantSelector` para seleção individual
- Lógica de deduplicação de contatos entre grupos
- Contagem de participantes selecionados vs total

Porém, na aba "Carrossel", essa funcionalidade está **explicitamente desabilitada** com a condição `{activeTab !== 'carousel' && ...}`.

---

## Mudanças Necessárias

### 1. Mostrar Toggle e ParticipantSelector no Carrossel

Atualmente (linhas 1918-1955):
```tsx
{/* Common sections for text and media tabs (carousel has different flow) */}
{activeTab !== 'carousel' && (
  <div className="space-y-4 mt-4">
    {/* Toggle para excluir admins */}
    ...
    {/* Participant Selector */}
    ...
  </div>
)}
```

Será alterado para mostrar também na aba carousel (removendo a condição de exclusão).

### 2. Atualizar `handleSendCarousel` para Suportar Envio Individual

A função atual (linhas 1031-1195) sempre envia para o JID do grupo. Precisa ser modificada para:
- Verificar se `excludeAdmins` está ativo
- Se sim, iterar pelos participantes selecionados em `selectedParticipants`
- Aplicar a mesma lógica de delay e controles de pausa/cancelamento

### 3. Atualizar Summary e Contadores

O badge de destinatários na aba carousel (linhas 2027-2038) precisa mostrar a contagem correta quando `excludeAdmins` estiver ativo.

---

## Layout Visual Esperado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Carrossel                                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Editor do carrossel - cards, botões, preview...]                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────┬──────────┐  │
│  │ 👥 Não enviar para Admins/Donos                            │   🔵     │  │
│  │    1 de 3 contato(s) selecionado(s)                        │          │  │
│  └────────────────────────────────────────────────────────────┴──────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 👥 Participantes para envio                   1 de 3 selecionado(s)    ││
│  │ ┌───────────────────────────────┐  [Todos] [Limpar]                    ││
│  │ │ 🔍 Buscar por número ou grupo │                                      ││
│  │ └───────────────────────────────┘                                      ││
│  │ ┌─────────────────────────────────────────────────────────────────────┐││
│  │ │ ✓ 55 81 93856099                                                    │││
│  │ │   Motorac 2026                                                      │││
│  │ ├─────────────────────────────────────────────────────────────────────┤││
│  │ │ ○ 55 81 93221157                                                    │││
│  │ │   Motorac 2026                                                      │││
│  │ ├─────────────────────────────────────────────────────────────────────┤││
│  │ │ ○ 55 81 91975413                                                    │││
│  │ │   Motorac 2026                                                      │││
│  │ └─────────────────────────────────────────────────────────────────────┘││
│  │ 2 participante(s) não receberão a mensagem.                            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ⏰ Intervalo entre envios (anti-bloqueio)                               ││
│  │    [Desativado] [5-10 seg] [10-20 seg]                                 ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  [📦 3 grupos] [👥 1 destinatário] [🃏 5 cards]                              │
│                                                                             │
│                                          [Enviar para 1] ──────────────────│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/broadcast/BroadcastMessageForm.tsx` | Remover exclusão do carousel do toggle/selector; atualizar `handleSendCarousel` |

---

## Detalhes Técnicos

### Modificar Exibição do Toggle e Selector

Remover a condição `{activeTab !== 'carousel' && ...}` do bloco que contém o toggle e o ParticipantSelector para que apareça em todas as abas.

### Atualizar handleSendCarousel

```typescript
const handleSendCarousel = async () => {
  // ... validações existentes ...

  if (excludeAdmins) {
    // Envio individual para participantes selecionados
    const membersToSend = uniqueRegularMembers.filter(m => 
      selectedParticipants.has(m.jid)
    );
    
    if (membersToSend.length === 0) {
      toast.error('Selecione pelo menos um participante');
      return;
    }
    
    // Loop pelos membros com delay
    for (let j = 0; j < membersToSend.length; j++) {
      // Check cancel/pause
      await sendCarouselToNumber(membersToSend[j].jid, carouselData, accessToken);
      // Delay
    }
  } else {
    // Envio para grupos (fluxo atual)
  }
};
```

### Atualizar Badge de Destinatários

```tsx
{activeTab === 'carousel' && (
  <Badge variant="outline" className="gap-1">
    <Users className="w-3 h-3" />
    {excludeAdmins ? selectedParticipants.size : selectedGroups.length} destinatário(s)
  </Badge>
)}
```

### Atualizar Botão de Envio

O botão já usa `targetCount` para texto/mídia. Para carousel, precisa usar a mesma lógica:
```tsx
Enviar para {excludeAdmins ? selectedParticipants.size : selectedGroups.length}
```

---

## Benefícios

- **Consistência**: Mesma funcionalidade disponível em todas as abas do disparador
- **Controle**: Usuário pode escolher exatamente quem receberá o carrossel
- **Anti-spam**: Combinado com o delay aleatório, reduz risco de bloqueio
- **Reutilização**: Usa os mesmos componentes e lógica já testados

