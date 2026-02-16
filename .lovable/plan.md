

# Atribuicao de agentes e transferencia entre agentes

## Visao geral

Implementar a funcionalidade de atribuir uma conversa a um agente da equipe e permitir transferir para outro agente. O campo `assigned_to` ja existe na tabela `conversations` e a tabela `inbox_users` ja lista os agentes disponiveis por inbox.

## Alteracoes

### 1. `src/components/helpdesk/ContactInfoPanel.tsx`
- Adicionar uma nova secao "Agente responsavel" abaixo de Prioridade
- Buscar a lista de agentes da inbox atual via `inbox_users` com join em `user_profiles` para obter o nome
- Renderizar um `Select` com os agentes disponiveis + opcao "Nenhum" para desatribuir
- Ao selecionar, chamar `onUpdateConversation(id, { assigned_to: userId })` que ja existe

### 2. `src/components/helpdesk/ChatPanel.tsx`
- Exibir o nome do agente atribuido no header do chat (ao lado do status), como um badge discreto
- Buscar o nome do agente via `user_profiles` quando `conversation.assigned_to` estiver preenchido

### 3. `src/pages/dashboard/HelpDesk.tsx`
- Incluir `assigned_to` no tipo `Conversation` (ja existe)
- Ao buscar conversas, incluir o nome do agente atribuido via join ou fetch separado para exibir na lista

### 4. `src/components/helpdesk/ConversationItem.tsx`
- Exibir um pequeno indicador do agente atribuido (iniciais ou icone) no item da lista de conversas

## Detalhes tecnicos

**Nenhuma migracao necessaria** - o campo `assigned_to` ja existe na tabela `conversations` como `uuid nullable`.

**Busca de agentes**: Query na tabela `inbox_users` com join em `user_profiles`:
```sql
SELECT iu.user_id, up.full_name, iu.role
FROM inbox_users iu
JOIN user_profiles up ON up.id = iu.user_id
WHERE iu.inbox_id = :inboxId
ORDER BY up.full_name
```

**Atribuicao/Transferencia**: Simples update no campo `assigned_to`:
```typescript
await supabase.from('conversations').update({ assigned_to: agentId }).eq('id', conversationId);
```

**Componentes afetados**:
- `ContactInfoPanel.tsx` - secao principal de atribuicao com Select de agentes
- `ChatPanel.tsx` - badge do agente no header
- `ConversationItem.tsx` - indicador visual na lista
- `HelpDesk.tsx` - fetch dos nomes dos agentes para cache local

