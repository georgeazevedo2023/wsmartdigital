
# Resumo Inteligente de Conversas por IA no Helpdesk

## Visão Geral

Adicionar um botão "✨ Resumir" no `ContactInfoPanel` (painel direito) que, ao ser clicado, usa IA (Gemini Flash) para gerar um resumo estruturado da conversa atual. O resultado é exibido como um card colapsável no painel de informações do contato, persistido no banco de dados para não precisar ser gerado novamente.

## Experiência do Usuário

```text
┌──────────────────────────────────┐
│  📋 Resumo da Conversa           │
│  ─────────────────────────────── │
│  🎯 Motivo do contato:           │
│  Cliente perguntou sobre         │
│  blindagem automotiva e pediu    │
│  atendimento humano de vendas    │
│  em Recife/PE.                   │
│                                  │
│  ✅ Resolvido: Contato de Milena │
│  (consultora de vendas) enviado  │
│                                  │
│  📅 Gerado às 17:05              │
│  [🔄 Atualizar]                  │
└──────────────────────────────────┘
```

## Arquitetura

### 1. Banco de dados — nova coluna `ai_summary`

Adicionar a coluna `ai_summary` (jsonb) na tabela `conversations` para armazenar o resumo gerado, evitando reprocessamento.

```sql
ALTER TABLE conversations ADD COLUMN ai_summary jsonb DEFAULT NULL;
```

Estrutura do JSON armazenado:
```json
{
  "summary": "Cliente perguntou sobre blindagem...",
  "reason": "Interesse em compra de veículo blindado",
  "resolution": "Contato de Milena (vendas) enviado",
  "generated_at": "2026-02-18T17:05:00.000-03:00",
  "message_count": 13
}
```

### 2. Nova Edge Function: `summarize-conversation`

**Arquivo:** `supabase/functions/summarize-conversation/index.ts`

Fluxo:
1. Recebe `{ conversation_id }` via POST
2. Valida autenticação do usuário + acesso à conversa via `has_inbox_access`
3. Busca todas as mensagens da conversa (`conversation_messages`)
4. Formata o histórico como texto (ex: `[Cliente]: Bom dia! / [Bot]: Bem-vindo...`)
5. Chama Gemini Flash via Lovable AI API com prompt em português:
   - Motivo do contato
   - Principais pontos discutidos
   - Resolução/próximo passo
6. Salva o resultado no campo `ai_summary` da conversa
7. Retorna o JSON do resumo

### 3. UI — `ContactInfoPanel.tsx`

Adicionar uma seção "Resumo da Conversa" com:
- Botão **"✨ Resumir conversa"** (estado inicial, sem resumo)
- Estado de **loading** enquanto a IA processa
- Card com o **resumo exibido** + botão de atualizar
- Timestamp de quando foi gerado (ex: "Gerado hoje às 17:05")

O componente vai:
- Ao abrir, verificar se `conversation.ai_summary` já existe no banco
- Se sim, exibir diretamente sem chamar a IA
- Se não, mostrar o botão para gerar

### 4. Passar `ai_summary` para o `ContactInfoPanel`

Em `HelpDesk.tsx`, o campo `ai_summary` já virá junto na query de conversas (já é da tabela `conversations`). Precisamos incluí-lo no `select` e na interface `Conversation`.

## Arquivos a modificar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | Adicionar coluna `ai_summary` jsonb na tabela `conversations` |
| `supabase/functions/summarize-conversation/index.ts` | Nova Edge Function com chamada à IA |
| `src/pages/dashboard/HelpDesk.tsx` | Incluir `ai_summary` na query e interface `Conversation` |
| `src/components/helpdesk/ContactInfoPanel.tsx` | Adicionar seção de resumo com botão, loading e card |

## Prompt da IA (em português)

```
Você é um assistente de atendimento ao cliente. Analise esta conversa de WhatsApp e gere um resumo estruturado em JSON com:
- "reason": motivo principal do contato (máx. 1 frase)
- "summary": resumo da conversa em 2-3 frases
- "resolution": como foi resolvido ou qual o próximo passo

Conversa:
[Cliente]: Bom dia!
[Atendente]: Bem-vindo a Neo Blindados...
...

Responda APENAS com o JSON, sem texto extra.
```

## Segurança

- A Edge Function valida o token JWT do usuário
- Verifica se o usuário tem acesso à conversa via `has_inbox_access`
- O resumo só pode ser gerado/lido por usuários com acesso à caixa de entrada

## Impacto

- Zero risco de regressão: coluna opcional (`DEFAULT NULL`)
- Resumos cached no banco — geração de IA acontece só uma vez (ou ao clicar "Atualizar")
- Sem novas dependências externas: usa a IA nativa do Lovable (Gemini Flash)
