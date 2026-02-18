
# Fix: Notas privadas não são excluídas do banco

## Causa raiz identificada

A tabela `conversation_messages` possui as seguintes políticas RLS:

| Política | Operação |
|---|---|
| `Inbox users can insert messages` | INSERT |
| `Inbox users can view messages` | SELECT |
| `Super admins can manage all messages` | ALL (inclui DELETE) |

**Não existe nenhuma política de DELETE para agentes comuns.** Quando Milena clica em "excluir nota", o Supabase recebe o comando DELETE, mas como não há política RLS permitindo a operação para ela, a linha é simplesmente ignorada — sem retornar erro. O código interpreta isso como sucesso, remove do estado local, e exibe o toast "Nota excluída". Mas a nota continua no banco. Ao recarregar, ela volta.

## O que precisa ser feito

### 1. Nova política RLS de DELETE em `conversation_messages` (migração)

Permitir que membros de uma inbox deletem apenas mensagens do tipo `private_note` nas conversas dessa inbox:

```sql
CREATE POLICY "Inbox users can delete private notes"
ON public.conversation_messages
FOR DELETE
USING (
  direction = 'private_note'
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_messages.conversation_id
      AND has_inbox_access(auth.uid(), c.inbox_id)
  )
);
```

Esta política garante:
- Apenas notas privadas podem ser deletadas (mensagens normais permanecem protegidas)
- O agente precisa ser membro da inbox da conversa (`has_inbox_access`)
- Usa a função existente `has_inbox_access` (já usada nas outras políticas)

### 2. Nenhuma mudança de código necessária

O código em `NotesPanel.tsx` já está correto:
- Faz DELETE no banco
- Chama `onNoteDeleted(noteId)` apenas se não houver erro
- Em `ChatPanel.tsx`, `onNoteDeleted` filtra o estado local: `setMessages(prev => prev.filter(m => m.id !== noteId))`

Uma vez que a política RLS permita o DELETE, o fluxo funcionará completamente.

## Fluxo após o fix

```text
Milena clica em "excluir nota"
  → DELETE conversation_messages WHERE id = noteId
    → RLS verifica: direction = 'private_note'? SIM
    → RLS verifica: has_inbox_access(milena_id, inbox_id)? SIM
    → DELETE executado com sucesso no banco
  → onNoteDeleted(noteId) é chamado
  → Estado local atualizado: nota desaparece da UI
  → Ao recarregar: nota não está mais no banco → não volta
```

## Arquivo a criar

- **Nova migração SQL**: Adiciona a política `"Inbox users can delete private notes"` na tabela `conversation_messages`
- **Sem mudanças de código**
