
# Correção: Resumos Automáticos para Conversas Existentes e Sem Resolução

## Diagnóstico

O sistema de resumo automático está correto na lógica, mas há três problemas que impedem os resumos de aparecer:

**Problema 1 — Nenhuma conversa foi marcada como "resolvida"**
Todas as 226 conversas estão com status `aberta`. O trigger `auto_summarize_on_resolve` só dispara quando o status muda para `resolvida`. Como isso nunca aconteceu, nenhum resumo foi gerado automaticamente via trigger.

**Problema 2 — Conversas antigas sem resumo (backfill necessário)**
As 222 conversas sem resumo existem desde antes do sistema. O cron de 1h de inatividade só processa conversas recentes, não faz backfill do histórico.

**Problema 3 — O histórico mostra a conversa mas sem contexto**
Quando uma conversa anterior existe mas não tem `ai_summary`, o card aparece na linha do tempo sem o resumo de motivo/resolução — o que torna o histórico pouco útil.

## Solução em 3 partes

### Parte 1 — Backfill: processar todas as conversas antigas sem resumo

Criar uma migration que via `pg_cron` ou diretamente chama a edge function `auto-summarize` para processar todas as 222 conversas que ainda não têm resumo, priorizando as mais recentes. Para não sobrecarregar a IA, processar em lotes de 10 por vez com intervalo.

Opção escolhida: a edge function `auto-summarize` já aceita chamadas em batch — vamos ajustá-la para processar conversas sem resumo independentemente do status (não só as inativas por 1h), com um endpoint de backfill.

### Parte 2 — Ajustar o critério do cron de 1h de inatividade

O cron atual busca conversas com última mensagem há mais de 1h. O problema: o critério pode estar muito restrito. Ajustar para também incluir conversas que:
- Têm pelo menos 5 mensagens (conversas com substância)
- Tiveram sua última mensagem enviada há mais de 1h
- Ainda não têm resumo
- Independentemente de estarem abertas ou resolvidas

### Parte 3 — Melhorar a UI do histórico quando não há resumo

Quando uma conversa anterior não tem `ai_summary`, em vez de mostrar um card vazio, exibir um botão "Gerar resumo" que chama a edge function `summarize-conversation` para aquela conversa específica (chamada direta, com o ID da conversa do histórico).

## Mudanças Técnicas

### Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `supabase/functions/auto-summarize/index.ts` | Adicionar endpoint `/backfill` que processa conversas sem resumo em lotes de 20 |
| `src/components/helpdesk/ContactInfoPanel.tsx` | Adicionar botão "Gerar resumo" nas conversas do histórico sem `ai_summary` |

### Fluxo do backfill

A edge function `auto-summarize` receberá um modo `backfill`:

```
POST /functions/v1/auto-summarize
{ "mode": "backfill", "limit": 20 }
```

Ela vai:
1. Buscar as 20 conversas mais recentes sem `ai_summary`, com pelo menos 3 mensagens
2. Para cada uma, chamar `summarize-conversation` 
3. Retornar quantas foram processadas

Isso será chamado uma vez manualmente (via botão no ContactInfoPanel ou diretamente), e também o cron horário passará a usar esse modo.

### UI — botão de resumo nas conversas do histórico

No `ContactInfoPanel.tsx`, quando uma conversa do histórico não tem `ai_summary`:

```
┌─────────────────────────────────┐
│ 15/02/2026  08:01    Aberta     │
│ ✨ Gerar resumo desta conversa  │
└─────────────────────────────────┘
```

Ao clicar, chama `summarize-conversation` com o `conversation_id` da conversa histórica. Ao retornar, atualiza o estado local com o resumo recebido.

### Ajuste no cron da auto-summarize

Atualizar a migration de cron para buscar conversas sem resumo com pelo menos 3 mensagens (via subquery), não apenas pelo tempo de inatividade:

```sql
-- Critério melhorado: conversas sem resumo com mensagens suficientes
SELECT id FROM conversations c
WHERE ai_summary IS NULL
  AND last_message_at < now() - interval '1 hour'
  AND (SELECT COUNT(*) FROM conversation_messages WHERE conversation_id = c.id) >= 3
ORDER BY last_message_at DESC
LIMIT 20
```

## Impacto esperado

Após a implementação:
- As conversas anteriores do histórico passarão a ter resumo gerado sob demanda (clique no botão)
- Novas conversas terão resumo gerado automaticamente após 1h de inatividade (mesmo sem serem "resolvidas")
- O backfill pode ser disparado para processar o histórico de 222 conversas existentes
