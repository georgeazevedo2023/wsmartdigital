

# Persistir estado da IA no banco de dados

## Problema atual

Quando voce recarrega a pagina ou troca de conversa e volta, o estado da IA e perdido. Mesmo que o ultimo webhook tenha enviado `status_ia="ligada"`, o botao volta a mostrar "Ativar IA" porque o estado so existe na memoria do frontend.

## Solucao

Salvar o `status_ia` diretamente na tabela `conversations` do banco de dados e carregar esse valor sempre que uma conversa for aberta.

## Alteracoes

### 1. Migracao de banco de dados
- Adicionar coluna `status_ia` (tipo `text`, default `null`) na tabela `conversations`

### 2. `supabase/functions/whatsapp-webhook/index.ts`
- Quando `status_ia` for detectado no payload recebido (ex: `"ligada"`), fazer UPDATE na conversa correspondente: `UPDATE conversations SET status_ia = 'ligada' WHERE id = conversation_id`
- Isso garante que o estado persiste no banco

### 3. `src/components/helpdesk/ChatInput.tsx`
- Quando o agente envia mensagem (e dispara `status_ia: "desligada"`), tambem fazer UPDATE na conversa: `UPDATE conversations SET status_ia = 'desligada' WHERE id = conversation_id`

### 4. `src/components/helpdesk/ChatPanel.tsx`
- Ao carregar uma conversa, inicializar `iaAtivada` com base em `conversation.status_ia === 'ligada'` (em vez de sempre `false`)
- Remover o reset fixo para `false` ao trocar de conversa; usar o valor vindo do banco
- Manter os listeners de broadcast para atualizacoes em tempo real (sem mudanca)
- Quando o broadcast atualiza o estado, tambem fazer UPDATE no banco para manter sincronizado

## Arquivos afetados

- Migracao SQL (nova coluna `status_ia` em `conversations`)
- `supabase/functions/whatsapp-webhook/index.ts` - persistir status_ia no banco
- `src/components/helpdesk/ChatInput.tsx` - persistir status_ia="desligada" ao enviar mensagem
- `src/components/helpdesk/ChatPanel.tsx` - carregar estado inicial do banco e manter sincronizado
