
# Correção: Botões URL do Carrossel Não Funcionando no WhatsApp

## Problema Identificado

Quando uma mensagem de carrossel é enviada e chega no WhatsApp, os botões do tipo URL (como "Comprar") não são clicáveis.

### Diagnóstico Técnico

Analisando os logs do edge function `uazapi-proxy`:

**Payload enviado (correto):**
```json
{
  "id": "2",
  "label": "Comprar",
  "display_text": "Comprar",
  "text": "Comprar", 
  "type": "URL",
  "url": "https://labolaria.com.br/"
}
```

**Resposta da UAZAPI (erro):**
```json
{
  "name": "cta_url",
  "buttonParamsJSON": "{\"display_text\":\"Comprar\",\"id\":\"2\",\"url\":\"2\",\"disabled\":false}"
}
```

O problema: A UAZAPI está substituindo o valor da URL pelo ID do botão (`"url":"2"` ao invés de `"url":"https://labolaria.com.br/"`).

### Causa Raiz

O payload está enviando **campos extras** (`display_text`, `text`) que não são documentados pela Z-API para botões de carrossel. A API pode estar confundindo esses campos e mapeando incorretamente.

A documentação oficial da Z-API especifica apenas estes campos para botões:
- `id` (opcional) - identificador do botão
- `label` - texto do botão
- `type` - tipo do botão (URL, CALL, REPLY)
- `url` - link para botões tipo URL
- `phone` - telefone para botões tipo CALL

---

## Solução Proposta

Simplificar o payload dos botões no edge function para enviar **apenas os campos documentados**, removendo `display_text`, `text` e `phoneNumber`.

### Arquivo a Modificar

`supabase/functions/uazapi-proxy/index.ts`

### Mudanças

**Antes (linhas 364-378):**
```typescript
const processedButtons = card.buttons?.map((btn, btnIdx) => {
  return {
    id: String(btnIdx + 1),
    label: btn.label,
    display_text: btn.label, 
    text: btn.label,
    type: btn.type,
    ...(btn.type === 'URL' && btn.url ? { url: btn.url } : {}),
    ...(btn.type === 'CALL' && btn.phone ? { phone: btn.phone, phoneNumber: btn.phone } : {}),
  }
}) || []
```

**Depois:**
```typescript
const processedButtons = card.buttons?.map((btn, btnIdx) => {
  // Formato conforme documentação Z-API: apenas id, label, type e url/phone
  const buttonObj: Record<string, string> = {
    id: btn.id || String(btnIdx + 1),
    label: btn.label,
    type: btn.type,
  };
  
  // Adicionar URL para botões de link
  if (btn.type === 'URL' && btn.url) {
    buttonObj.url = btn.url;
  }
  
  // Adicionar telefone para botões de ligação
  if (btn.type === 'CALL' && btn.phone) {
    buttonObj.phone = btn.phone;
  }
  
  return buttonObj;
}) || []
```

### Benefícios da Correção

1. **Payload limpo**: Apenas campos documentados pela API
2. **IDs únicos**: Preservar ID original do botão em vez de sobrescrever
3. **Sem campos conflitantes**: Remover `display_text`, `text`, `phoneNumber` que podem causar confusão

---

## Testes para Validação

1. Criar um carrossel com 2 cards contendo:
   - Botão tipo REPLY (Resposta)
   - Botão tipo URL com link real
   - Botão tipo CALL com telefone
   
2. Enviar para um contato de teste

3. Verificar no WhatsApp:
   - Botão URL abre o link corretamente ao clicar
   - Botão CALL inicia discagem
   - Botão REPLY retorna resposta

4. Verificar logs do edge function para confirmar payload simplificado
