

# Corrigir: Mensagens do Agente IA nao aparecem na caixa "Ibirajuba Teste"

## Diagnostico

O webhook retorna `status_ia_instance_not_found` porque:

1. O payload do n8n envia `"owner": "558181696546"` 
2. O codigo na linha 119 converte para `558181696546@s.whatsapp.net`
3. No banco, o `owner_jid` da instancia esta salvo como `558181696546` (sem o sufixo)
4. A comparacao falha e a instancia nao e encontrada

Este bug afeta TODAS as caixas de entrada onde o `owner_jid` nao tem o sufixo `@s.whatsapp.net`.

## Solucao (duas partes)

### Parte 1: Corrigir o webhook (backend)

**Arquivo:** `supabase/functions/whatsapp-webhook/index.ts`

Na secao de busca por `owner` (linhas 117-121), adicionar busca com E sem o sufixo `@s.whatsapp.net`:

```
// Antes (bugado):
const ownerJidVal = ownerField.includes('@') ? ownerField : `${ownerField}@s.whatsapp.net`
iaInstanceQuery = iaInstanceQuery.eq('owner_jid', ownerJidVal)

// Depois (corrigido):
const ownerClean = ownerField.replace('@s.whatsapp.net', '')
const ownerWithSuffix = `${ownerClean}@s.whatsapp.net`
iaInstanceQuery = iaInstanceQuery.or(`owner_jid.eq.${ownerClean},owner_jid.eq.${ownerWithSuffix}`)
```

Isso garante que a busca funciona independente de como o `owner_jid` esta salvo no banco.

### Parte 2: Recomendacao para o n8n (opcional mas mais robusto)

Para cada fluxo de agente IA no n8n, incluir `inbox_id` no payload. Isso elimina completamente a necessidade de buscar a instancia. Exemplo para Ibirajuba Teste:

```
"inbox_id": "f851e9c8-f7a5-40bc-be12-697993fc5dbd"
```

IDs das caixas de entrada disponiveis:

| Caixa | inbox_id |
|---|---|
| Vendas 01 - Wsmart | d7f5a437-a147-48f2-9f79-b29c8a2567b3 |
| Neo Blindados - Geral | 79575754-f7a2-4945-8d88-bfc7e1f20ed4 |
| Ibirajuba | 74c8fa53-45a7-4237-83f6-4d2548e083ed |
| Ibirajuba Teste | f851e9c8-f7a5-40bc-be12-697993fc5dbd |

## Resumo

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Buscar owner_jid com e sem sufixo @s.whatsapp.net |

A URL do webhook continua sendo uma so para todas as caixas. O que identifica a caixa e o conteudo do payload (owner, instance_id, ou inbox_id).
