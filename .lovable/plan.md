
# Corrigir Formatação de Números Internacionais

## Problema Identificado

O número "29 57 0900168819" está sendo exibido incorretamente. Analisando o código atual:

```typescript
// Lógica atual (linhas 26-43)
const formatPhoneNumber = (value: string): string => {
  const number = value.split('@')[0].replace(/\D/g, '');
  if (!number || number.length < 10) return value;
  
  const isBrazilian = number.startsWith('55') && number.length >= 12 && number.length <= 13;
  
  if (isBrazilian) {
    return `${ddi} ${ddd} ${numero}`;
  }
  
  return number; // Deveria retornar sem espaços
};
```

O código diz que deveria retornar apenas `2957...` sem espaços, mas está exibindo `29 57 0900168819`.

**Causa provável:** O dado (`member.phoneNumber` ou `member.jid`) já está vindo pré-formatado da API com espaços, e a função está recebendo esse valor com espaços já incluídos.

O `replace(/\D/g, '')` remove caracteres não numéricos incluindo espaços, então o número deveria ser limpo. Isso indica que:

1. O valor original pode conter algo antes do "@" que já tem espaços
2. Ou há uma inconsistência na lógica de fallback

---

## Solução

Modificar a lógica para garantir que números não-brasileiros também sejam exibidos de forma mais legível, aplicando um formato genérico:

### Código Corrigido

```typescript
const formatPhoneNumber = (value: string): string => {
  const number = value.split('@')[0].replace(/\D/g, '');
  if (!number || number.length < 10) return value;
  
  // Verifica se é número brasileiro (começa com 55 e tem 12-13 dígitos)
  const isBrazilian = number.startsWith('55') && number.length >= 12 && number.length <= 13;
  
  if (isBrazilian) {
    // Formato brasileiro: 55 XX XXXXXXXXX
    const ddi = number.slice(0, 2); // 55
    const ddd = number.slice(2, 4); // DDD
    const numero = number.slice(4); // Número
    return `${ddi} ${ddd} ${numero}`;
  }
  
  // Para outros números, exibe apenas os dígitos limpos (sem formatação)
  // Isso garante consistência visual e evita formatação incorreta
  return number;
};
```

**Porém**, olhando a imagem novamente, o número está com espaços, então o problema pode estar no **dado de entrada**. O `member.phoneNumber` pode estar vindo com espaços da API.

### Solução Adicional - Garantir Limpeza do Dado

Se o dado já vem formatado incorretamente, precisamos garantir que a limpeza ocorra corretamente e que retornemos apenas dígitos para números internacionais:

```typescript
const formatPhoneNumber = (value: string): string => {
  // Remove tudo exceto dígitos
  const number = value.split('@')[0].replace(/\D/g, '');
  if (!number || number.length < 10) return number || value;
  
  // Verifica se é número brasileiro (começa com 55 e tem 12-13 dígitos)
  const isBrazilian = number.startsWith('55') && number.length >= 12 && number.length <= 13;
  
  if (isBrazilian) {
    // Formato brasileiro: 55 XX XXXXXXXXX
    const ddi = number.slice(0, 2);
    const ddd = number.slice(2, 4);
    const numero = number.slice(4);
    return `${ddi} ${ddd} ${numero}`;
  }
  
  // Números internacionais: retorna apenas os dígitos sem formatação
  return number;
};
```

---

## Arquivo a Modificar

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `src/components/broadcast/ParticipantSelector.tsx` | 26-43 | Garantir que números não-brasileiros retornem apenas dígitos limpos |

---

## Resultado Esperado

- Número brasileiro: `55 81 93856099` (formatado corretamente)
- Número internacional: `29570900168819` (apenas dígitos, sem formatação incorreta)
