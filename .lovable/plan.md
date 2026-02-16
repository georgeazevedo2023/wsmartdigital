

# Corrigir toast de login persistente, horario na lista e melhorar mobile

## Problemas identificados

### 1. Toast "Login realizado com sucesso!" fica fixo na tela
O componente Sonner esta configurado sem `duration`, e como nao usa o `next-themes` provider (o projeto usa classes CSS para tema), o `useTheme()` retorna valores incorretos, o que pode causar comportamentos inesperados no toast. A solucao e adicionar `duration={3000}` ao Sonner para garantir que os toasts desaparecam automaticamente.

### 2. Horario nao aparece na lista de conversas (mobile)
Olhando o screenshot, os nomes dos contatos aparecem sem nenhum horario ao lado. O `ConversationItem` renderiza o horario na linha 56-60 com `text-[10px]`, mas o layout `flex items-center justify-between` pode estar sendo comprimido no mobile. Alem disso, preciso verificar se o `last_message_at` esta chegando corretamente nas conversas. O `smartDateBR` esta correto agora, mas o texto pode estar muito pequeno ou invisivel.

### 3. Melhorar design mobile-first
O layout atual funciona mas pode ser mais moderno: melhorar espacamento, tipografia e visual geral da lista de conversas no mobile.

---

## Alteracoes

### 1. Corrigir toast persistente (`src/components/ui/sonner.tsx`)

Adicionar `duration={3000}` e `richColors` ao Sonner para auto-dismiss e visual melhor:

```typescript
<Sonner
  theme={theme as ToasterProps["theme"]}
  className="toaster group"
  duration={3000}
  richColors
  position="top-center"
  // ... rest
/>
```

### 2. Garantir horario visivel no `ConversationItem` (`src/components/helpdesk/ConversationItem.tsx`)

Aumentar tamanho do texto do horario de `text-[10px]` para `text-xs` e garantir que ele sempre apareca com cor mais visivel:

```typescript
<span className="text-xs text-muted-foreground/80 shrink-0 tabular-nums">
  {conversation.last_message_at
    ? smartDateBR(conversation.last_message_at)
    : ''}
</span>
```

### 3. Melhorar layout mobile da lista de conversas

Ajustes no `ConversationItem` e `ConversationList` para um visual mais moderno:
- Aumentar padding e espacamento para melhor toque
- Melhorar hierarquia visual com tamanhos de fonte adequados
- Garantir que nome + horario fiquem alinhados horizontalmente com espaco adequado

### 4. Melhorar header mobile do Helpdesk (`HelpDesk.tsx`)

Otimizar o header unificado para mobile:
- Tornar o seletor de caixa responsivo (largura menor no mobile)
- Empilhar elementos no mobile se necessario

---

## Arquivos afetados

- `src/components/ui/sonner.tsx` - adicionar duration e richColors
- `src/components/helpdesk/ConversationItem.tsx` - melhorar visibilidade do horario e layout mobile
- `src/components/helpdesk/ConversationList.tsx` - ajustes visuais mobile
- `src/pages/dashboard/HelpDesk.tsx` - header responsivo

