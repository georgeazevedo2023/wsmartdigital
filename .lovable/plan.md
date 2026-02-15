
# Adicionar Envio de Imagens e Melhorar Envio de Documentos no HelpDesk

## Problema Atual

O input de arquivo no ChatInput aceita apenas documentos (`.pdf`, `.doc`, etc.) e nao aceita imagens (`.jpg`, `.png`, etc.). Alem disso, todos os arquivos sao enviados como `mediaType: 'document'`, mesmo que sejam imagens.

## Alteracoes

### `src/components/helpdesk/ChatInput.tsx`

1. **Expandir o `accept` do input de arquivo** para incluir imagens: `.jpg,.jpeg,.png,.gif,.webp` alem dos documentos ja suportados.

2. **Detectar automaticamente o tipo de midia** no `handleSendFile`:
   - Se o `file.type` comecar com `image/`, enviar como `mediaType: 'image'` com preview visual
   - Caso contrario, manter o envio como `mediaType: 'document'`

3. **Adicionar botao dedicado para imagem** (icone de camera/imagem) ao lado do botao de documento (Paperclip), para tornar mais intuitivo o envio de fotos. Alternativamente, manter um unico botao mas aceitar ambos os tipos.

## Secao Tecnica

### Deteccao de tipo no handleSendFile

```text
const isImage = file.type.startsWith('image/');
const mediaType = isImage ? 'image' : 'document';

// No payload para uazapi-proxy:
body: {
  action: 'send-media',
  mediaType: mediaType,   // 'image' ou 'document'
  caption: '',             // imagens podem ter legenda
  filename: isImage ? undefined : file.name,  // filename so para documentos
  ...
}

// No insert do banco:
media_type: mediaType,  // 'image' ou 'document'
content: isImage ? null : file.name,
```

### Atualizacao do accept

```text
// De:
accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"

// Para:
accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
```

### Arquivos modificados:
- `src/components/helpdesk/ChatInput.tsx` - Expandir accept + detectar tipo de midia automaticamente
