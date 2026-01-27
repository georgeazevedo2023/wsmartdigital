

# Plano: Edição Inline no Preview com Formatação (Negrito e Quebra de Linha)

## Objetivo
Permitir que o usuário clique diretamente no texto do preview para editar a mensagem, e adicionar suporte visual para:
- **Quebras de linha** (Enter/\n)
- **Negrito** usando a sintaxe do WhatsApp (`*texto*`)

---

## Comportamento Esperado

### Edição Inline
1. Usuário clica no texto do preview
2. O texto se transforma em um campo editável (textarea inline)
3. Usuário edita diretamente no balão
4. Ao clicar fora (blur) ou pressionar Escape, volta ao modo de visualização
5. As alterações são sincronizadas com o campo de texto/legenda principal

### Formatação Visual
O preview renderizará a formatação do WhatsApp:
- `*texto*` aparece como **texto** em negrito
- Quebras de linha (`\n`) são exibidas corretamente

---

## Arquitetura da Solução

### Componente MessagePreview Atualizado

```
┌─────────────────────────────────────────────────────────────┐
│ 👁️ Preview da mensagem (clique para editar)                │
│                                                             │
│       ┌────────────────────────────────────────────┐        │
│       │ [Mídia se houver]                          │        │
│       │                                            │        │
│       │ ┌────────────────────────────────────────┐ │        │
│       │ │ Olá *pessoal*!                         │ │        │
│       │ │                                        │ │        │
│       │ │ Esta é uma mensagem com               │ │        │
│       │ │ **quebra de linha** e *negrito*.       │ │        │
│       │ └────────────────────────────────────────┘ │        │
│       │                              ✓✓ 12:00     │        │
│       └────────────────────────────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Quando clicado:

```
┌─────────────────────────────────────────────────────────────┐
│ 👁️ Preview da mensagem (editando...)                       │
│                                                             │
│       ┌────────────────────────────────────────────┐        │
│       │ [Mídia se houver]                          │        │
│       │                                            │        │
│       │ ┌────────────────────────────────────────┐ │        │
│       │ │ [Textarea editável]                    │ │        │
│       │ │ Olá *pessoal*!                         │ │        │
│       │ │                                        │ │        │
│       │ │ Esta é uma mensagem com                │ │        │
│       │ │ quebra de linha e *negrito*.           │ │        │
│       │ └────────────────────────────────────────┘ │        │
│       │                              ✓✓ 12:00     │        │
│       └────────────────────────────────────────────┘        │
│                                                             │
│  💡 Use *texto* para negrito • Enter para quebra de linha   │
└─────────────────────────────────────────────────────────────┘
```

---

## Mudanças no Código

### 1. Atualizar Interface do MessagePreview

Adicionar props para callback de edição e estado de disabled:

```typescript
interface MessagePreviewProps {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  mediaUrl?: string;
  previewUrl?: string | null;
  filename?: string;
  isPtt?: boolean;
  onTextChange?: (newText: string) => void;  // NOVO
  disabled?: boolean;                          // NOVO
}
```

### 2. Adicionar Estado de Edição

```typescript
const [isEditing, setIsEditing] = useState(false);
const [editText, setEditText] = useState(text || '');
const textareaRef = useRef<HTMLTextAreaElement>(null);

// Sincronizar quando text muda externamente
useEffect(() => {
  if (!isEditing) {
    setEditText(text || '');
  }
}, [text, isEditing]);
```

### 3. Criar Função de Formatação para WhatsApp

```typescript
const formatWhatsAppText = (text: string): React.ReactNode[] => {
  // Regex para encontrar *texto* (negrito do WhatsApp)
  const boldRegex = /\*([^*]+)\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Adicionar texto antes do match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Adicionar texto em negrito
    parts.push(
      <strong key={match.index} className="font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  
  // Adicionar texto restante
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
};
```

### 4. Atualizar Renderização do Texto

Substituir o texto estático por versão clicável/editável:

```tsx
{/* Texto ou legenda - agora editável */}
{text !== undefined && (
  <div 
    onClick={() => !disabled && setIsEditing(true)}
    className={cn(
      "text-sm whitespace-pre-wrap break-words cursor-pointer transition-colors",
      !disabled && "hover:bg-primary/5 rounded px-1 -mx-1"
    )}
  >
    {isEditing ? (
      <textarea
        ref={textareaRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent border-none outline-none resize-none text-sm min-h-[60px]"
        autoFocus
      />
    ) : (
      text ? formatWhatsAppText(text) : (
        <span className="text-muted-foreground italic">
          Clique para adicionar texto...
        </span>
      )
    )}
  </div>
)}
```

### 5. Handlers de Edição

```typescript
const handleBlur = () => {
  setIsEditing(false);
  if (editText !== text && onTextChange) {
    onTextChange(editText);
  }
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  // Escape cancela a edição
  if (e.key === 'Escape') {
    setEditText(text || '');
    setIsEditing(false);
  }
  // Enter mantém quebra de linha (comportamento padrão)
};
```

### 6. Adicionar Dica de Formatação

Quando em modo de edição, mostrar dica abaixo do preview:

```tsx
{isEditing && (
  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
    <span>💡</span>
    <span>
      Use <code className="bg-muted px-1 rounded">*texto*</code> para negrito • Enter para quebra de linha
    </span>
  </p>
)}
```

### 7. Integrar no BroadcastMessageForm

Passar o callback de alteração de texto:

```tsx
<MessagePreview 
  type={activeTab === 'text' ? 'text' : mediaType}
  text={activeTab === 'text' ? message : caption}
  mediaUrl={activeTab === 'media' ? mediaUrl : undefined}
  previewUrl={activeTab === 'media' ? previewUrl : undefined}
  filename={filename}
  isPtt={isPtt}
  onTextChange={(newText) => {
    if (activeTab === 'text') {
      setMessage(newText);
    } else {
      setCaption(newText);
    }
  }}
  disabled={isSending}
/>
```

---

## Resultado Visual

### Modo Visualização (com formatação)
```
┌──────────────────────────────────────────────────┐
│ Olá *todos*!                                     │
│                                                  │
│ Esta é uma mensagem de teste.                    │
│                                      ✓✓ 14:30   │
└──────────────────────────────────────────────────┘
```

Renderizado como:
```
┌──────────────────────────────────────────────────┐
│ Olá **todos**!                                   │
│                                                  │
│ Esta é uma mensagem de teste.                    │
│                                      ✓✓ 14:30   │
└──────────────────────────────────────────────────┘
```

### Modo Edição
```
┌──────────────────────────────────────────────────┐
│ [Textarea editável]                              │
│ Olá *todos*!                                     │
│                                                  │
│ Esta é uma mensagem de teste.                    │
│                                                  │
└──────────────────────────────────────────────────┘
💡 Use *texto* para negrito • Enter para quebra de linha
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/broadcast/MessagePreview.tsx` | Adicionar estado de edição, formatação WhatsApp, textarea inline |
| `src/components/broadcast/BroadcastMessageForm.tsx` | Passar `onTextChange` e `disabled` para o MessagePreview |

---

## Benefícios

- **Edição direta**: Usuário pode editar onde vê o resultado, mais intuitivo
- **Feedback visual de formatação**: Vê o negrito renderizado em tempo real
- **Suporte nativo a quebras**: Enter cria nova linha naturalmente
- **Sintaxe familiar**: Usa `*texto*` igual ao WhatsApp
- **Dica de ajuda**: Ensina a formatação para novos usuários

