

# Exibir Números Completos dos Leads

## Problema Identificado
Os números de telefone na lista de leads estão sendo exibidos de forma mascarada (`+55 • • • • • • • 18`) em vez do número completo. Isso pode ocorrer porque:
1. Alguns dados antigos foram salvos com a mascara de privacidade
2. A linha secundaria mostra o JID bruto sem formatacao

## Solucao Proposta
Modificar o componente `LeadList.tsx` para exibir os numeros de forma limpa e formatada, extraindo os digitos do campo `phone` ou `jid` e aplicando uma formatacao legivel.

---

## Alteracoes

### Arquivo: `src/components/broadcast/LeadList.tsx`

1. Adicionar funcao de formatacao de numero para exibicao:

```typescript
// Formata o numero para exibicao: +55 81 99999-9999
const formatPhoneForDisplay = (phone: string, jid?: string): string => {
  // Usa o phone ou extrai do JID
  let number = phone || jid?.split('@')[0] || '';
  
  // Remove caracteres nao-numericos e mascara
  number = number.replace(/[^\d]/g, '');
  
  if (!number || number.length < 10) return phone;
  
  // Se nao comeca com 55, adiciona
  if (!number.startsWith('55') && number.length <= 11) {
    number = '55' + number;
  }
  
  // Formata: +55 81 99999-9999
  if (number.length >= 12) {
    const ddi = number.slice(0, 2);
    const ddd = number.slice(2, 4);
    const parte1 = number.slice(4, 9);
    const parte2 = number.slice(9);
    return `+${ddi} ${ddd} ${parte1}-${parte2}`;
  }
  
  return phone;
};
```

2. Modificar a renderizacao do numero (linhas 211-216):

**De:**
```tsx
<p className="font-medium text-sm truncate">
  {lead.verifiedName || lead.name || lead.phone}
</p>
{(lead.verifiedName || lead.name) && (
  <p className="text-xs text-muted-foreground">{lead.phone}</p>
)}
```

**Para:**
```tsx
<p className="font-medium text-sm truncate">
  {lead.verifiedName || lead.name || formatPhoneForDisplay(lead.phone, lead.jid)}
</p>
{(lead.verifiedName || lead.name) && (
  <p className="text-xs text-muted-foreground">
    {formatPhoneForDisplay(lead.phone, lead.jid)}
  </p>
)}
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| `+55 • • • • • • • 18` | `+55 81 99999-9918` |
| `149018185359478` | `+55 14 90181-85359` (ou numero formatado) |

---

## Observacoes Tecnicas

- A funcao `formatPhoneForDisplay` limpa qualquer mascara existente nos dados
- Extrai apenas os digitos numericos
- Aplica o formato padrao brasileiro (+55 DDD XXXXX-XXXX)
- Usa o campo `jid` como fallback caso o `phone` esteja corrompido

