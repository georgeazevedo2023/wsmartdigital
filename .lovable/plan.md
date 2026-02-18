
# Bug: Milena salva como texto em vez de card de contato

## Diagnóstico definitivo (confirmado pelos logs)

Os logs da Edge Function mostram o payload exato que chegou da Milena:
```json
{
  "messageType": "ContactMessage",
  "content": {
    "displayName": "Milena",
    "vcard": "BEGIN:VCARD..."
  }
}
```

O log de processamento registrou: `mediaType=text` — provando que o tipo foi detectado errado.

**Causa raiz:** A função `normalizeMediaType` (linha 277) usa:
```ts
normalizeMediaType(message.mediaType || message.type || '')
```

Mas a UAZAPI envia o tipo como **`messageType`** (não `mediaType` nem `type`). O campo `messageType: "ContactMessage"` nunca é consultado.

**Por que Eliane e Bruno funcionaram?** Provavelmente foram recebidos em um momento em que outro campo (`type` ou `mediaType`) estava preenchido, ou a UAZAPI enviou o payload com estrutura ligeiramente diferente naquele momento.

**Confirmação no banco:**
- Eliane: `media_type: contact`, `media_url: {"displayName":"Eliane","vcard":"..."}` — correto
- Milena: `media_type: text`, `media_url: null` — incorreto (salva como texto puro)

## Solução — 2 correções

### Correção 1: `whatsapp-webhook/index.ts` — incluir `messageType` na detecção

**Linha 277, antes:**
```ts
const mediaType = normalizeMediaType(message.mediaType || message.type || '')
```

**Depois:**
```ts
const mediaType = normalizeMediaType(message.mediaType || message.messageType || message.type || '')
```

Isso garante que `"ContactMessage"` seja reconhecido e normalizado para `"contact"`.

### Correção 2: Banco de dados — corrigir mensagens da Milena já salvas

As duas mensagens da Milena no banco (`id: 7622978e...` e `id: 998ef56c...`) precisam ser corrigidas. O vCard já foi recebido corretamente nos logs — apenas não foi salvo certo.

A migração SQL irá:
1. Atualizar `media_type` de `text` → `contact`
2. Atualizar `media_url` com o JSON da vCard correto
3. Atualizar `content` para `"Milena"` (limpo, sem a formatação de texto)

SQL a executar:
```sql
-- Corrigir mensagem da Milena (20:02 de 18/02)
UPDATE conversation_messages 
SET 
  media_type = 'contact',
  media_url = '{"displayName":"Milena","vcard":"BEGIN:VCARD\nVERSION:3.0\nN:Milena\nFN:Milena\nORG:Neo Blindados;\nEMAIL:milena@neoblindados.com.br\nURL:https://neoblindados.com.br/\nitem1.TEL;waid=558193202137:5581993202137\nitem1.X-ABLabel:Celular\nEND:VCARD"}',
  content = 'Milena'
WHERE id IN (
  '7622978e-1548-4f68-b2c9-45231a471f18',
  '998ef56c-cc8e-4523-98a1-b22b33d0db1c'
);
```

## Arquivos a modificar

1. **`supabase/functions/whatsapp-webhook/index.ts`** — linha 277: adicionar `message.messageType` na cadeia de fallback
2. **Migration SQL** — corrigir os registros da Milena já salvos no banco

## Impacto

- Sem mudanças de UI
- Zero risco de regressão: `messageType` é apenas um campo adicional de fallback
- Todos os cards de contato futuros (independente de qual campo UAZAPI usar) serão detectados corretamente
- Mensagens históricas da Milena serão corrigidas e exibidas como card no helpdesk imediatamente após o deploy
