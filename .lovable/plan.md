
# Melhorar a Versão Mobile do Histórico de Envios

## Problemas Identificados

Analisando a captura de tela, identifiquei os seguintes problemas na versão mobile:

| Problema | Impacto |
|----------|---------|
| Filtros ocupando muito espaço vertical | Dificulta visualização dos registros |
| Cada filtro em uma linha separada | Layout desorganizado e ineficiente |
| Campos de data muito largos | Não cabem bem na tela |
| Input de busca cortado | Texto fica truncado |
| Badges empilhados nos cards | Difícil leitura rápida |

---

## Solução Proposta

### 1. Filtros Colapsáveis no Mobile

Transformar a seção de filtros em um accordion/collapsible que fica fechado por padrão no mobile, mostrando apenas um botão "Filtros" com contador de filtros ativos.

```text
+----------------------------------+
| [≡] Histórico de Envios    [↻]  |
+----------------------------------+
| [🔍 Filtros (2 ativos)]  [▼]    |  <- Colapsado por padrão
+----------------------------------+
| ☐ Selecionar todos               |
+----------------------------------+
| [Card 1...]                      |
| [Card 2...]                      |
```

### 2. Grid Responsivo para Filtros Expandidos

Quando expandido no mobile, usar grid de 2 colunas para os selects:

```text
+----------------------------------+
| [Todos status ▼] [Todos tipos ▼] |
| [Todos dest. ▼] [Todas inst. ▼]  |
+----------------------------------+
| [📅 De...]  até  [📅 Até...]    |
+----------------------------------+
| [🔍 Buscar...]                   |
+----------------------------------+
| [Limpar filtros]                 |
+----------------------------------+
```

### 3. Cards de Histórico Otimizados

Reorganizar o layout dos cards para mobile:
- Mover badges para layout vertical compacto
- Alinhar estatísticas à direita em coluna
- Reduzir padding interno

---

## Alterações Técnicas

### Arquivo: `src/components/broadcast/BroadcastHistory.tsx`

#### 1. Adicionar Import do Hook useIsMobile
```typescript
import { useIsMobile } from '@/hooks/use-mobile';
```

#### 2. Adicionar Estado para Controle dos Filtros no Mobile
```typescript
const isMobile = useIsMobile();
const [filtersExpanded, setFiltersExpanded] = useState(false);
```

#### 3. Refatorar Seção de Filtros

**Antes:** Filtros sempre visíveis em flex-wrap

**Depois:** Wrapper condicional com Collapsible no mobile

```tsx
{/* Mobile: Collapsible filters */}
{isMobile ? (
  <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded}>
    <CollapsibleTrigger asChild>
      <Button
        variant="outline"
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          filtersExpanded && "rotate-180"
        )} />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="pt-3 space-y-3">
      {/* Filtros em grid 2 colunas */}
      <div className="grid grid-cols-2 gap-2">
        {/* Status Select */}
        {/* Type Select */}
        {/* Target Select */}
        {/* Instance Select */}
      </div>
      {/* Date inputs em linha */}
      <div className="flex items-center gap-2">
        <Input type="date" className="flex-1" />
        <span>até</span>
        <Input type="date" className="flex-1" />
      </div>
      {/* Search input full width */}
      <Input placeholder="Buscar..." className="w-full" />
      {/* Clear button */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="w-4 h-4 mr-1" /> Limpar filtros
        </Button>
      )}
    </CollapsibleContent>
  </Collapsible>
) : (
  // Desktop: layout atual
  <div className="space-y-3">...</div>
)}
```

#### 4. Adicionar Contador de Filtros Ativos
```typescript
const activeFilterCount = useMemo(() => {
  let count = 0;
  if (statusFilter !== 'all') count++;
  if (typeFilter !== 'all') count++;
  if (targetFilter !== 'all') count++;
  if (instanceFilter !== 'all') count++;
  if (dateFrom) count++;
  if (dateTo) count++;
  if (searchQuery) count++;
  return count;
}, [statusFilter, typeFilter, targetFilter, instanceFilter, dateFrom, dateTo, searchQuery]);
```

#### 5. Otimizar Cards de Histórico para Mobile

Ajustar classes responsivas nos cards:
```tsx
<div className="flex items-start sm:items-center justify-between cursor-pointer flex-col sm:flex-row gap-2 sm:gap-0">
  {/* Content */}
</div>
```

Para os badges dentro dos cards:
```tsx
<div className="flex items-center gap-1.5 flex-wrap">
  {getStatusBadge(log.status)}
  <Badge variant="outline" className="text-xs">
    {getMessageTypeLabel(log.message_type)}
  </Badge>
  {/* ... outros badges */}
</div>
```

#### 6. Ajustar Controles de Seleção em Lote

No mobile, empilhar os controles verticalmente:
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border/30">
  <label className="flex items-center gap-2 cursor-pointer text-sm">
    <input type="checkbox" ... />
    <span>Selecionar todos</span>
  </label>
  {selectedIds.size > 0 && (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <Button variant="ghost" size="sm" className="flex-1 sm:flex-none">
        Limpar
      </Button>
      <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
        Excluir {selectedIds.size}
      </Button>
    </div>
  )}
</div>
```

#### 7. Otimizar Grid de Estatísticas Expandidas

```tsx
<div className="grid grid-cols-1 gap-2 text-sm">
  {/* Em mobile, cada stat em uma linha */}
</div>
```

---

## Resultado Visual Esperado

### Mobile (< 768px)
```text
+---------------------------+
| Histórico de Envios   [↻] |
+---------------------------+
| [🔍 Filtros (2)]      [▼] |
+---------------------------+
| ☐ Selecionar todos        |
| 2 selecionado(s)          |
| [Limpar] [Excluir 2]      |
+---------------------------+
| ☐ [💬] ✅ Concluído       |
|    Texto · Leads          |
|    Instância ABC          |
|              3/3 · 100%   |
+---------------------------+
| ☐ [🖼️] ✅ Concluído       |
|    Imagem · 5 grupos      |
|    Instância XYZ          |
|             12/15 · 80%   |
+---------------------------+
```

### Desktop (>= 768px)
Layout atual mantido sem alterações significativas.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/broadcast/BroadcastHistory.tsx` | Adicionar lógica responsiva para filtros colapsáveis e cards otimizados |

---

## Benefícios

1. **Mais espaço para conteúdo**: Filtros colapsados liberam a tela
2. **Navegação mais rápida**: Usuário vê os registros imediatamente
3. **Interação otimizada**: Botões e controles com tamanho adequado para toque
4. **Indicador visual**: Badge mostra quantos filtros estão ativos mesmo com painel fechado
