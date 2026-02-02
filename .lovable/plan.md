
# Plano: Melhorar Layout do Disparador - UI Mais Fluida e Moderna

## Problemas Identificados

1. **Scrollbars aninhadas**: O `GroupSelector` usa `ScrollArea` com altura fixa de 400px, e o `CarouselEditor` também tem `max-h-[400px] overflow-y-auto` nos cards. Isso cria múltiplas barras de rolagem dentro do conteúdo principal.

2. **Espaçamento com sidebar**: A página não tem padding consistente em relação ao menu lateral, causando sensação de "colagem".

3. **Layout rígido**: Uso de alturas fixas limita a fluidez do conteúdo.

---

## Mudanças Propostas

### 1. DashboardLayout - Melhorar Espaçamento Global

Adicionar padding interno consistente no container principal para criar respiro entre sidebar e conteúdo.

```
Antes:
┌──────────┬─────────────────────┐
│ Sidebar  │Conteúdo sem padding │
│          │colado na borda      │
└──────────┴─────────────────────┘

Depois:
┌──────────┬─────────────────────┐
│ Sidebar  │  ┌───────────────┐  │
│          │  │ Conteúdo com  │  │
│          │  │ padding 6     │  │
│          │  └───────────────┘  │
└──────────┴─────────────────────┘
```

### 2. Broadcaster.tsx - Padding e Estrutura

- Adicionar `p-6` ao container principal para espaçamento uniforme
- Remover elementos redundantes de `Card` quando desnecessários
- Simplificar estrutura visual

### 3. GroupSelector - Eliminar ScrollArea Interna

- Remover `ScrollArea` com altura fixa
- Usar altura máxima com `max-h-[60vh]` que se adapta à tela
- Deixar scroll nativo do container pai funcionar
- Adicionar `scroll-smooth` para transições suaves

### 4. CarouselEditor - Remover Scroll Aninhado

- Remover `max-h-[400px] overflow-y-auto` dos cards
- Deixar cards fluírem naturalmente
- O scroll principal da página cuida da navegação

### 5. Melhorias Visuais Modernas

- Adicionar transições mais suaves nos cards
- Bordas mais sutis (border-border/30 em vez de border-border/50)
- Usar backdrop-blur mais sutil
- Espaçamentos mais generosos (gap-4 em vez de gap-3)

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/DashboardLayout.tsx` | Adicionar padding interno ao main |
| `src/pages/dashboard/Broadcaster.tsx` | Melhorar padding e estrutura |
| `src/components/broadcast/GroupSelector.tsx` | Remover ScrollArea fixa |
| `src/components/broadcast/CarouselEditor.tsx` | Remover overflow interno |

---

## Detalhes Técnicos

### DashboardLayout.tsx

```typescript
<main className="flex-1 overflow-y-auto">
  <div className="min-h-full p-6">
    <Outlet />
  </div>
</main>
```

Adicionar um wrapper interno com padding para que todo o conteúdo tenha espaçamento consistente.

### Broadcaster.tsx

Remover padding duplicado (já vem do layout) e simplificar estrutura:

```typescript
<div className="space-y-6 max-w-5xl mx-auto">
  {/* Conteúdo centralizado e com largura máxima */}
</div>
```

### GroupSelector.tsx

Substituir ScrollArea por:

```typescript
<div className="max-h-[calc(100vh-400px)] overflow-y-auto scroll-smooth">
  <div className="space-y-2 pr-1">
    {filteredGroups.map((group) => (
      // Cards dos grupos
    ))}
  </div>
</div>
```

Isso permite que a lista se adapte à altura disponível da viewport, eliminando scroll aninhado.

### CarouselEditor.tsx

De:
```typescript
<div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
```

Para:
```typescript
<div className="space-y-4">
```

Os cards fluem naturalmente e o scroll é controlado pelo container pai.

---

## Benefícios

- **Sem scroll aninhado**: Uma única área de rolagem por página
- **Responsivo**: Altura se adapta à viewport
- **Mais espaçado**: Padding consistente entre sidebar e conteúdo
- **Visual moderno**: Transições suaves e bordas mais sutis
- **Performance**: Menos camadas de scroll = melhor performance

---

## Resultado Visual Esperado

```
┌──────────────────────────────────────────────────────┐
│ ┌────────┐  ┌──────────────────────────────────────┐ │
│ │Sidebar │  │                                      │ │
│ │        │  │   Header com breadcrumb              │ │
│ │        │  │                                      │ │
│ │        │  │   ┌────────────────────────────────┐ │ │
│ │        │  │   │ Lista de Grupos (scroll único) │ │ │
│ │        │  │   │                                │ │ │
│ │        │  │   │                                │ │ │
│ │        │  │   │                                │ │ │
│ │        │  │   └────────────────────────────────┘ │ │
│ │        │  │                                      │ │
│ │        │  │   Botão Continuar                    │ │
│ │        │  │                                      │ │
│ │        │  └──────────────────────────────────────┘ │
│ └────────┘                                           │
└──────────────────────────────────────────────────────┘
```
