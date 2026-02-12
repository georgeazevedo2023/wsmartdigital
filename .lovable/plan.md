

# Melhorar UX/UI Mobile-First do Helpdesk

## Problemas Identificados

1. **Layout conflitante**: O `DashboardLayout` aplica `p-4`/`p-6` e `overflow-y-auto` ao redor do Helpdesk, desperdicando espaco e causando scroll duplo. O Helpdesk precisa ocupar 100% da area disponivel sem padding externo.
2. **Altura incorreta**: `h-[calc(100vh-4rem)]` nao funciona bem dentro do container com padding. Deve usar `h-full` e deixar o container flex controlar.
3. **Falta de polish visual**: Componentes basicos sem refinamento para toque, contraste e hierarquia visual.
4. **Inbox selector ocupa espaco desnecessario no mobile**: Pode ser integrado ao header da lista.

## Mudancas por Arquivo

### 1. `src/components/dashboard/DashboardLayout.tsx`

Remover padding e overflow do container do Outlet quando a rota for o helpdesk. A abordagem mais simples: o Helpdesk controlara seu proprio layout, entao o DashboardLayout precisa permitir que filhos usem `h-full`. Mudar o wrapper do Outlet para usar `flex-1 flex flex-col` sem padding fixo, e deixar cada pagina controlar seu proprio padding.

**Alternativa mais segura (sem quebrar outras paginas)**: Manter o layout atual, mas no HelpDesk usar classes que compensem o padding e preencham a tela inteira.

### 2. `src/pages/dashboard/HelpDesk.tsx`

- Trocar `h-[calc(100vh-4rem)]` por `h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] -m-4 md:-m-6` para compensar o padding do DashboardLayout e preencher a tela toda
- Melhorar o inbox selector: no mobile, integrar ao header da ConversationList com design compacto
- Ajustar o container principal para usar bordas arredondadas apenas no desktop

### 3. `src/components/helpdesk/ConversationList.tsx`

- Aumentar area de toque dos status tabs (padding maior)
- Melhorar search input com visual mais destacado
- Header mais compacto e hierarquico
- Scroll mais suave

### 4. `src/components/helpdesk/ConversationItem.tsx`

- Aumentar avatar para `w-11 h-11` no mobile
- Melhorar tipografia: nome com `text-sm font-medium`, preview com `text-xs`
- Adicionar indicador de nao lido mais visivel (borda lateral + texto bold)
- Melhorar timestamp com formato relativo mais legivel

### 5. `src/components/helpdesk/ChatPanel.tsx`

- Header mais robusto com avatar do contato
- Botoes de acao com area de toque de 44px minimo
- Melhorar estado vazio com visual mais acolhedor

### 6. `src/components/helpdesk/ChatInput.tsx`

- Botoes com `h-10 w-10` no mobile (44px area de toque)
- Textarea com `text-base` fixo para evitar zoom iOS
- Padding mais generoso para conforto ao digitar

### 7. `src/components/helpdesk/MessageBubble.tsx`

- Aumentar `max-w` para `max-w-[85%]` no mobile (mais espaco para conteudo)
- Melhorar contraste das cores das bolhas
- Imagens com `max-h-64` para nao dominar a tela

### 8. `src/components/helpdesk/ContactInfoPanel.tsx`

- Avatar maior no mobile (`w-20 h-20`)
- Botoes de acao (status/prioridade) com tamanho de toque adequado (`h-10`)
- Espacamento mais generoso entre secoes

## Detalhes Tecnicos

Compensar padding do DashboardLayout no HelpDesk:

```typescript
// No HelpDesk.tsx - compensar padding externo
<div className="flex flex-col h-[calc(100vh-4rem)] -m-4 md:-m-6 overflow-hidden">
```

Inbox selector integrado ao mobile:

```typescript
// No mobile, o inbox selector fica inline no header da ConversationList
// em vez de ser uma barra separada
<div className="flex items-center justify-between p-3 pb-0">
  <h2 className="font-bold text-lg">Atendimento</h2>
  <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
    <SelectTrigger className="w-auto h-8 text-xs gap-1">
      <SelectValue />
    </SelectTrigger>
    ...
  </Select>
</div>
```

ChatPanel header com avatar:

```typescript
<div className="h-14 px-3 flex items-center gap-3 border-b">
  {onBack && <Button variant="ghost" size="icon" ...><ArrowLeft /></Button>}
  <Avatar className="w-9 h-9 shrink-0">
    <AvatarImage src={contact?.profile_pic_url} />
    <AvatarFallback>{initials}</AvatarFallback>
  </Avatar>
  <div className="flex-1 min-w-0">
    <h3 className="font-semibold text-sm truncate">{name}</h3>
    <p className="text-xs text-muted-foreground">{contact?.phone}</p>
  </div>
  {onShowInfo && <Button variant="ghost" size="icon" ...><User /></Button>}
</div>
```

ConversationItem melhorado:

```typescript
// Indicador de nao lido mais forte
<button className={cn(
  'w-full text-left px-3 py-3 min-h-[60px] flex items-center gap-3',
  isSelected && 'bg-primary/10 border-l-2 border-primary',
  !conversation.is_read && 'bg-primary/5 border-l-2 border-primary/60'
)}>
```

## Resultado

- Mobile: tela cheia sem padding desperdicado, toque confortavel (44px+), sem zoom iOS
- Desktop: layout polido, sem regressoes visuais
- Ambos: melhor hierarquia visual, indicadores de nao lido mais claros, avatar no header do chat
