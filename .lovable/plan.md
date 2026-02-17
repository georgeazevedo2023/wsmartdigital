
# Desativar IA ao enviar mensagem pelo Helpdesk

## Problema

O broadcast do Supabase Realtime nao entrega a mensagem de volta para o mesmo cliente que a enviou. Isso significa que quando o agente envia uma mensagem, o `status_ia: 'desligada'` no broadcast nao e recebido pelo proprio `ChatPanel` do agente. O banco de dados e atualizado corretamente, mas o estado visual (`iaAtivada`) nao muda imediatamente.

## Solucao

Atualizar o `ChatPanel` para setar `iaAtivada = false` diretamente quando o agente envia uma mensagem, sem depender do broadcast.

## Alteracao

### `src/components/helpdesk/ChatPanel.tsx`

Trocar o callback `onMessageSent={fetchMessages}` por uma funcao que faz duas coisas:
1. Chama `fetchMessages()` (como ja faz hoje)
2. Seta `setIaAtivada(false)` imediatamente

Isso garante que:
- Ao enviar texto, audio, imagem ou documento, o badge "IA Ativada" troca instantaneamente para o botao "Ativar IA"
- O botao "Ativar IA" permanece visivel ate o webhook retornar `status_ia="ligada"`
- Quando `status_ia="ligada"` chega (via broadcast do webhook), o badge verde "IA Ativada" volta a aparecer

### Codigo da alteracao (linha 295)

De:
```tsx
<ChatInput conversation={conversation} onMessageSent={fetchMessages} ... />
```

Para:
```tsx
<ChatInput conversation={conversation} onMessageSent={() => { fetchMessages(); setIaAtivada(false); }} ... />
```

## Arquivo afetado

- `src/components/helpdesk/ChatPanel.tsx` - apenas 1 linha alterada
