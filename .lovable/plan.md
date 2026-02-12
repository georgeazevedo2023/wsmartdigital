

# Corrigir Exibicao de Imagens e Mostrar Link Publico

## Problema

As URLs do CDN do WhatsApp (`mmg.whatsapp.net`) sao bloqueadas pelo navegador (CORS/403) quando usadas diretamente em tags `<img>`. Por isso as imagens aparecem com icone quebrado. O download no servidor tambem corrompe os dados.

## Solucao

### 1. MessageBubble - Tratamento de erro + Link publico

**Arquivo: `src/components/helpdesk/MessageBubble.tsx`**

- Adicionar estado `imgError` para detectar quando a imagem falha
- Quando falhar, mostrar placeholder com icone de imagem e botao "Abrir imagem"
- **Sempre** mostrar o link da URL publica abaixo da imagem (ou do placeholder), como solicitado
- Tornar a imagem clicavel (abre em nova aba)

```typescript
// Logica de fallback
const [imgError, setImgError] = useState(false);

// Se imagem carregou OK: mostra imagem + link abaixo
// Se imagem falhou: mostra placeholder + link para abrir
```

### 2. Resultado visual

- Imagem carregou: imagem visivel + link clicavel abaixo
- Imagem falhou (CORS): placeholder cinza com icone + link "Abrir imagem" que abre a URL original em nova aba
- Em ambos os casos, o link da URL publica aparece abaixo

### Arquivo a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/helpdesk/MessageBubble.tsx` | Adicionar estado imgError, fallback visual, link publico da URL abaixo da imagem |

