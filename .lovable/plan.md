# Notas Privadas: Substituir por Ícone + Painel de Notas

## Problema Atual

As notas privadas aparecem inline no fluxo de mensagens, misturadas com as conversas normais. Isso polui o chat e as notas "sobem" conforme novas mensagens chegam.

## Solução Proposta

1. **Ocultar notas do fluxo de mensagens** — Mensagens com `direction === 'private_note'` não serão mais renderizadas no `ChatPanel` junto com as mensagens normais.
2. **Ícone de notas no cabeçalho do chat** — Quando existir ao menos uma nota na conversa, um ícone 📝 aparece no cabeçalho do `ChatPanel` com um badge de contagem.
3. **Painel de notas (Sheet/Dialog lateral)** — Ao clicar no ícone, abre um painel listando todas as notas com:
  - Conteúdo da nota e agente que escreveu a nota
  - Horário de criação
  - Botão de excluir cada nota individualmente
4. **Ícone na lista de conversas** — No `ConversationItem`, exibir um pequeno ícone 📝 quando a conversa possui notas, para sinalizar visualmente sem precisar abrir o chat.

## Arquivos Afetados

### `src/components/helpdesk/ChatPanel.tsx`

- Separar mensagens normais das notas: `const notes = messages.filter(m => m.direction === 'private_note')`
- Renderizar apenas `messages.filter(m => m.direction !== 'private_note')` no fluxo do chat
- Adicionar botão com ícone `StickyNote` no header com badge de contagem quando `notes.length > 0`
- Ao clicar no ícone, abrir um `Sheet` (painel lateral) com a lista de notas

### `src/components/helpdesk/NotesPanel.tsx` *(novo)*

- Componente `Sheet` com lista de notas
- Cada nota exibe: texto, horário (formatBR), botão de excluir (ícone de lixeira)
- Ao excluir, chama `supabase.from('conversation_messages').delete().eq('id', noteId)` e atualiza a lista localmente

### `src/components/helpdesk/ConversationItem.tsx`

- Receber prop `hasNotes?: boolean`
- Exibir ícone `StickyNote` pequeno ao lado dos labels quando `hasNotes === true`

### `src/components/helpdesk/ConversationList.tsx` / `src/pages/dashboard/HelpDesk.tsx`

- Carregar se a conversa tem notas (query adicional ou incluída no fetch de mensagens)
- Passar prop `hasNotes` ao `ConversationItem`

## Fluxo de Dados

```text
ChatPanel.fetchMessages()
  → messages = todos os tipos
  → notes = messages.filter(direction === 'private_note')
  → chatMessages = messages.filter(direction !== 'private_note')

Header:
  → notes.length > 0 → mostra botão StickyNote com badge
  → onClick → abre NotesPanel

NotesPanel:
  → lista notes
  → delete → supabase.delete → atualiza estado local
```

## Detalhes Técnicos

- O `Sheet` do shadcn/ui já está disponível no projeto — será utilizado para o painel de notas
- A exclusão é local (sem refresh) via `setMessages(prev => prev.filter(m => m.id !== id))` após confirmação do delete no banco
- O ícone no `ConversationItem` requer apenas verificar se alguma mensagem da conversa é `private_note` — isso pode ser feito com uma coluna derivada ou com uma query separada no `HelpDesk.tsx`
- Para evitar N+1 queries, a informação de "tem notas" pode ser carregada com um campo `has_notes` calculado no fetch de conversas via subquery SQL no Supabase