

# Plano: Formatação Combinada e Botões de Formatação Rápida

## Objetivo
1. Suportar formatação combinada como `*_negrito itálico_*` ou `_*itálico negrito*_`
2. Adicionar botões de formatação rápida (B, I, S) que inserem automaticamente os caracteres de formatação ao redor do texto selecionado

---

## 1. Formatação Combinada

### Problema Atual
A regex atual não suporta formatação aninhada. Por exemplo:
- `*_texto_*` deveria renderizar como **_texto em negrito itálico_**
- `~*texto*~` deveria renderizar como ~~**texto tachado em negrito**~~

### Solução: Parser Recursivo
Substituir a regex simples por um parser que processa formatação em camadas:

```typescript
const formatWhatsAppText = (text: string): React.ReactNode => {
  // Função recursiva que aplica formatação em camadas
  const applyFormatting = (
    content: string, 
    keyPrefix: string = ''
  ): React.ReactNode[] => {
    const patterns = [
      { regex: /\*([^*]+)\*/, wrapper: 'bold' },
      { regex: /_([^_]+)_/, wrapper: 'italic' },
      { regex: /~([^~]+)~/, wrapper: 'strike' }
    ];
    
    // Encontrar o primeiro match
    let firstMatch = null;
    let matchedPattern = null;
    
    for (const pattern of patterns) {
      const match = pattern.regex.exec(content);
      if (match && (!firstMatch || match.index < firstMatch.index)) {
        firstMatch = match;
        matchedPattern = pattern;
      }
    }
    
    if (!firstMatch || !matchedPattern) {
      return [<span key={keyPrefix}>{content}</span>];
    }
    
    const parts: React.ReactNode[] = [];
    
    // Texto antes do match
    if (firstMatch.index > 0) {
      parts.push(...applyFormatting(
        content.slice(0, firstMatch.index), 
        `${keyPrefix}-pre`
      ));
    }
    
    // Conteúdo formatado (recursivo para suportar aninhamento)
    const innerContent = applyFormatting(firstMatch[1], `${keyPrefix}-inner`);
    const wrappedContent = wrapWithStyle(
      innerContent, 
      matchedPattern.wrapper, 
      `${keyPrefix}-wrap`
    );
    parts.push(wrappedContent);
    
    // Texto depois do match
    const afterIndex = firstMatch.index + firstMatch[0].length;
    if (afterIndex < content.length) {
      parts.push(...applyFormatting(
        content.slice(afterIndex), 
        `${keyPrefix}-post`
      ));
    }
    
    return parts;
  };
  
  return <>{applyFormatting(text, 'fmt')}</>;
};
```

---

## 2. Botões de Formatação Rápida

### Layout Visual

```
┌──────────────────────────────────────────────────────────────┐
│ 👁️ Preview da mensagem                                      │
│                                                              │
│       ┌────────────────────────────────────────────┐         │
│       │ [Mídia se houver]                          │         │
│       │                                            │         │
│       │ ┌────────────────────────────────────────┐ │         │
│       │ │ [Textarea quando editando]             │ │         │
│       │ └────────────────────────────────────────┘ │         │
│       │                              ✓✓ 12:00     │         │
│       └────────────────────────────────────────────┘         │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ [B] [I] [S]          💡 Selecione texto e clique       │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Componente de Botões

```typescript
interface FormatButtonProps {
  label: string;
  title: string;
  formatChar: string;
  onClick: () => void;
  disabled?: boolean;
}

const FormatButton = ({ label, title, onClick, disabled }: FormatButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "w-7 h-7 rounded text-xs font-bold border transition-colors",
      "hover:bg-primary/10 hover:border-primary/30",
      "disabled:opacity-50 disabled:cursor-not-allowed"
    )}
  >
    {label}
  </button>
);
```

### Lógica de Inserção

```typescript
const applyFormat = (formatChar: string) => {
  if (!textareaRef.current) return;
  
  const textarea = textareaRef.current;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = editText.substring(start, end);
  
  let newText: string;
  let newCursorPos: number;
  
  if (selectedText) {
    // Texto selecionado: envolver com formatação
    newText = 
      editText.substring(0, start) + 
      formatChar + selectedText + formatChar + 
      editText.substring(end);
    newCursorPos = end + 2; // Após o fechamento
  } else {
    // Sem seleção: inserir par de caracteres e posicionar cursor no meio
    newText = 
      editText.substring(0, start) + 
      formatChar + formatChar + 
      editText.substring(end);
    newCursorPos = start + 1; // Entre os caracteres
  }
  
  setEditText(newText);
  
  // Restaurar foco e posição do cursor
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
  });
};
```

---

## Comportamento dos Botões

| Situação | Ação do Botão |
|----------|---------------|
| Texto selecionado: "olá" | Clique em B → `*olá*` |
| Texto selecionado: "mundo" | Clique em I → `_mundo_` |
| Sem seleção, cursor no meio | Clique em S → Insere `~~` e cursor entre |
| Texto já formatado: `*texto*` | Clique em I → `*_texto_*` (adiciona camada) |

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/broadcast/MessagePreview.tsx` | Atualizar parser para suportar aninhamento + adicionar botões de formatação |

---

## Detalhes de Implementação

### Interface Atualizada
```typescript
// Botões aparecem apenas quando está editando
{isEditing && (
  <div className="flex items-center gap-2 mt-2">
    <div className="flex gap-1">
      <FormatButton 
        label="B" 
        title="Negrito (*texto*)"
        onClick={() => applyFormat('*')}
      />
      <FormatButton 
        label="I" 
        title="Itálico (_texto_)"
        onClick={() => applyFormat('_')}
      />
      <FormatButton 
        label="S" 
        title="Tachado (~texto~)"
        onClick={() => applyFormat('~')}
      />
    </div>
    <span className="text-xs text-muted-foreground">
      Selecione texto e clique para formatar
    </span>
  </div>
)}
```

### Estilo dos Botões
- **B** (Bold): Texto em negrito no próprio botão
- **I** (Italic): Texto em itálico no próprio botão  
- **S** (Strikethrough): Texto com linha no meio

---

## Benefícios

- **Formatação combinada**: Suporte a `*_negrito itálico_*` e outras combinações
- **Formatação rápida**: Um clique para aplicar estilo ao texto selecionado
- **Intuitivo**: Botões B/I/S familiares de editores de texto
- **Acessível**: Tooltips explicando cada formato
- **Feedback visual**: Botões aparecem apenas no modo de edição

