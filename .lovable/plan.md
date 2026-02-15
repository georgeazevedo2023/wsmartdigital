

# Alterar Status da Conversa Diretamente no Chat

## Objetivo

Adicionar um seletor de status no header do ChatPanel para que o agente possa alterar o status da conversa (Aberta, Pendente, Resolvida) sem sair do chat.

## Alteracao

### Arquivo: `src/components/helpdesk/ChatPanel.tsx`

Adicionar um componente `Select` (do shadcn/ui) no header do chat, ao lado do nome do contato, mostrando o status atual com cores distintas:

- **Aberta** - badge verde
- **Pendente** - badge amarelo
- **Resolvida** - badge cinza

Ao trocar o valor no select, chamar `onUpdateConversation(conversation.id, { status: novoStatus })` que ja existe como prop e ja faz o update no banco.

### Posicao no header

O seletor ficara entre as informacoes do contato e os botoes de acao (info/toggle), como um pequeno dropdown compacto.

### Detalhes tecnicos

- Usar `Select` do shadcn/ui (ja instalado)
- Valores: `aberta`, `pendente`, `resolvida` (ja sao os valores usados na tabela `conversations.status`)
- O callback `onUpdateConversation` ja esta implementado no HelpDesk.tsx e faz `supabase.from('conversations').update()`
- Nenhuma migracao de banco necessaria
- Apenas um arquivo modificado: `ChatPanel.tsx`

