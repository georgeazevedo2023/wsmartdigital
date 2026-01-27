
# Plano: Corrigir geração de QR Code para conexão de instâncias

## Problema Identificado

A integração com a API UAZAPI para geração de QR Code está incorreta. Com base na documentação oficial (`/instance/connect`):

**Comportamento esperado pela API:**
- O token da instância deve ser enviado no **header** como `token`
- O body deve estar **vazio** para gerar QR Code (ou conter apenas `phone` para código de pareamento)
- A resposta retorna o QR Code em formato base64

**Implementação atual (incorreta):**
- Está enviando `admintoken` no header em vez do `token` da instância
- Está enviando `instanceName` e `token` no body (desnecessário)
- Por isso a API não retorna o QR Code corretamente

---

## Solução

Corrigir a função de proxy para seguir a documentação oficial da UAZAPI.

### Alteração no Edge Function

**Arquivo:** `supabase/functions/uazapi-proxy/index.ts`

**Antes:**
```typescript
case 'connect': {
  response = await fetch(`${uazapiUrl}/instance/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'admintoken': adminToken,
    },
    body: JSON.stringify({
      instanceName,
      token: instanceToken,
    }),
  })
  break
}
```

**Depois:**
```typescript
case 'connect': {
  // Validar se o token da instância foi fornecido
  if (!instanceToken) {
    return new Response(
      JSON.stringify({ error: 'Instance token required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  console.log('Connecting instance with token (first 10 chars):', instanceToken.substring(0, 10))
  
  // Conforme documentação UAZAPI: token da instância no header, body vazio para QR Code
  response = await fetch(`${uazapiUrl}/instance/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': instanceToken,  // Token da instância no header
    },
    body: JSON.stringify({}),  // Body vazio gera QR Code
  })
  
  console.log('Connect response status:', response.status)
  break
}
```

---

## Resumo das Mudanças

1. **Trocar header**: De `admintoken` para `token` (usando o token da instância)
2. **Limpar body**: Enviar objeto vazio `{}` em vez de `instanceName` e `token`
3. **Adicionar validação**: Verificar se `instanceToken` foi fornecido antes de fazer a requisição
4. **Adicionar logs**: Para facilitar debug futuro

---

## Detalhes Técnicos

### Por que a correção funciona

De acordo com a documentação UAZAPI:

```text
POST /instance/connect
- Requer o token de autenticação da instância (no header)
- Gera um QR code caso não passe o campo 'phone' no body
- Ou gera código de pareamento se passar o campo 'phone'
```

A API espera receber o token específico da instância no header `token`, não o token administrativo. O body vazio (ou sem `phone`) instrui a API a gerar um QR Code em vez de um código de pareamento.

### Resposta esperada da API

A API deve retornar algo como:
```json
{
  "status": "connecting",
  "qrcode": "data:image/png;base64,..."
}
```

O frontend já está preparado para lidar com essa resposta, verificando `data.qrcode` ou `data.base64`.
