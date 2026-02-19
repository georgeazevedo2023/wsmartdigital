
# Simplificação da Configuração de Campos do Kanban

## Problema Atual

O toggle **"Campo principal (exibe no card)"** na aba Campos causa confusão porque o usuário entende que precisa marcar individualmente quais campos aparecerão no card. Na prática, o sistema já funciona assim:

- **1 campo marcado como principal** → vira o título do card (destaque)
- **Todos os demais campos** → já são exibidos no card automaticamente (até 3, pelo código atual)

Mas o label enganoso faz o usuário achar que precisa fazer algo especial para que os outros campos apareçam, quando na verdade o problema pode estar apenas no limite (3 campos extras, não 5).

## Mudanças Planejadas

### 1. `src/components/kanban/EditBoardDialog.tsx` — Clarificar o label do toggle

**Antes:**
```
Switch: "Campo principal (exibe no card)"
```

**Depois:**
```
Switch: "Título do card"
         ↳ texto de ajuda: "Os demais campos aparecem automaticamente no card (até 5)"
```

Manter o comportamento de rádio (apenas um pode ser marcado por vez) — já funciona corretamente via `updateField`.

Adicionar também um texto explicativo no topo da aba Campos:
> "O campo marcado como **Título** aparece em destaque no card. Os demais campos com valor são exibidos automaticamente abaixo, até 5 campos."

### 2. `src/components/kanban/KanbanCardItem.tsx` — Aumentar limite de campos extras de 3 para 5

Linha 101 atual:
```typescript
.slice(0, 3)
```

Muda para:
```typescript
.slice(0, 5)
```

### Resultado Visual Esperado

```text
┌─────────────────────────────────────┐
│  George Azevedo              ⠿       │  ← campo Título (is_primary)
│  CPF: 123.456.789-00                │  ← campo extra 1
│  Origem: Indicação                  │  ← campo extra 2
│  Valor: R$ 150.000,00               │  ← campo extra 3
│  Produto: Crédito Rural             │  ← campo extra 4
│  Vencimento: 15/03/2026             │  ← campo extra 5
│  [G] Gustavo                        │  ← responsável
└─────────────────────────────────────┘
```

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/kanban/EditBoardDialog.tsx` | Renomear label do toggle para "Título do card"; adicionar texto explicativo na aba Campos |
| `src/components/kanban/KanbanCardItem.tsx` | Aumentar limite de campos extras de `.slice(0, 3)` para `.slice(0, 5)` |

**Total: 2 arquivos, mudanças mínimas — sem alteração de banco de dados**

## O que NÃO muda

- O comportamento de rádio (apenas um campo pode ser "Título" por vez) continua igual
- Todos os campos continuam sendo exibidos no formulário de detalhe do card
- A lógica de salvamento do CardDetailSheet permanece intacta
- Nenhuma coluna nova no banco de dados
