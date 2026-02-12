
# Exibir Documentos no Chat do HelpDesk

## Situacao Atual

O backend (webhook) ja trata documentos corretamente:
- `normalizeMediaType` ja mapeia `document` e `pdf` para `'document'`
- `getMediaLink` ja obtem o link persistente via `/message/download` com `return_link: true`
- O `fileName` da mensagem ja e salvo como `content` quando nao ha caption (linha 169-171 do webhook)

O unico problema e que o `MessageBubble.tsx` nao tem um bloco de renderizacao para `media_type === 'document'`. Documentos simplesmente nao aparecem visualmente.

## Mudanca Necessaria

### Arquivo: `src/components/helpdesk/MessageBubble.tsx`

Adicionar um bloco de renderizacao para documentos entre o bloco de video e o bloco de content. O componente vai:

1. Mostrar um card visual com icone de arquivo (FileText do Lucide)
2. Exibir o nome do arquivo extraido da URL ou do content da mensagem
3. Botao/link para abrir/baixar o documento em nova aba
4. Detectar a extensao do arquivo (PDF, DOC, XLSX, etc.) e mostrar como badge

### Visual proposto

```text
+----------------------------------+
|  [FileText]  documento.pdf       |
|              PDF  -  Abrir       |
+----------------------------------+
```

- Fundo com borda sutil (similar ao fallback de imagem)
- Icone `FileText` do Lucide
- Nome do arquivo truncado se muito longo
- Badge com a extensao do arquivo
- Link "Abrir" que abre em nova aba

### Detalhes Tecnicos

- Importar `FileText` e `Download` do `lucide-react`
- Extrair nome do arquivo: usar `message.content` (que ja contem o fileName) ou extrair da URL
- Extrair extensao: split no "." do nome do arquivo, fallback para "DOC"
- O link aponta para `message.media_url` com `target="_blank"`
- Nenhuma mudanca no backend necessaria
