
# Otimizar mobile do Helpdesk: ocultar "Caixa", sincronizar e acelerar carregamento

## 1. Ocultar label "Caixa:" no mobile

Na linha 412 do `HelpDesk.tsx`, adicionar `hidden md:inline` ao span "Caixa:":

```typescript
<span className="hidden md:inline text-xs text-muted-foreground">Caixa:</span>
```

## 2. Ocultar botao de sincronizar no mobile

Nas linhas 394-403 do `HelpDesk.tsx`, adicionar `hidden md:flex` ao botao de sync:

```typescript
<Button
  variant="ghost"
  size="icon"
  onClick={handleSync}
  disabled={syncing}
  className="h-7 w-7 hidden md:flex"
  title="Sincronizar conversas"
>
```

## 3. Acelerar carregamento da lista de conversas

O principal gargalo de performance esta nas linhas 209-216: o sistema busca TODAS as mensagens de TODAS as conversas para extrair apenas a ultima de cada uma. Isso e extremamente ineficiente.

**Solucao**: Usar o campo `last_message` que ja existe na tabela `conversations` (preenchido pelo webhook/broadcast) em vez de buscar as mensagens separadamente. Se o campo estiver vazio, usar o fallback do `inbox.name`.

Isso elimina a query extra de `conversation_messages` que e a mais pesada, reduzindo o tempo de carregamento significativamente.

A query de `conversation_messages` sera removida, e o mapeamento simplificado:

```typescript
const mapped: Conversation[] = (data || []).map((c: any) => ({
  ...c,
  contact: c.contacts,
  inbox: c.inboxes,
  last_message: c.last_message || null,
}));
```

Se o campo `last_message` na tabela `conversations` nao estiver sendo populado consistentemente, adicionaremos uma abordagem hibrida: usar `last_message` da tabela quando disponivel, e so buscar de `conversation_messages` para os que nao tem.

## Arquivos afetados

- `src/pages/dashboard/HelpDesk.tsx` - ocultar elementos no mobile + otimizar query
