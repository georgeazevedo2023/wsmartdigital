

# Adicionar Salvamento de Templates com Carrossel no Disparador de Leads

## Problema Identificado

O formulário de mensagens para leads (`LeadMessageForm`) não possui a funcionalidade de salvar e carregar templates, incluindo templates de carrossel. Atualmente, apenas o `BroadcastMessageForm` (grupos) possui essa funcionalidade.

---

## Alterações Necessárias

### 1. Atualizar Interface do TemplateSelector

O tipo de retorno do callback `onSave` precisa incluir `carousel_data` para suportar salvamento de templates de carrossel.

**Arquivo:** `src/components/broadcast/TemplateSelector.tsx`

**Alteração na interface:**
```typescript
interface TemplateSelectorProps {
  onSelect: (template: MessageTemplate) => void;
  onSave: () => { 
    name: string; 
    content?: string; 
    message_type: string; 
    media_url?: string; 
    filename?: string;
    carousel_data?: CarouselData;  // Adicionar esta propriedade
  } | null;
  disabled?: boolean;
}
```

**Importação adicional:**
```typescript
import type { CarouselData } from './CarouselEditor';
```

---

### 2. Adicionar TemplateSelector ao LeadMessageForm

**Arquivo:** `src/components/broadcast/LeadMessageForm.tsx`

**Novos imports:**
```typescript
import { TemplateSelector } from './TemplateSelector';
import type { MessageTemplate } from '@/hooks/useMessageTemplates';
```

**Nova função handleSelectTemplate:**
```typescript
const handleSelectTemplate = (template: MessageTemplate) => {
  if (template.message_type === 'carousel' && template.carousel_data) {
    setActiveTab('carousel');
    setCarouselData(template.carousel_data);
  } else if (template.message_type === 'text') {
    setActiveTab('text');
    setMessage(template.content || '');
  } else {
    setActiveTab('media');
    const typeMap: Record<string, MediaType> = {
      'image': 'image',
      'video': 'video',
      'audio': 'audio',
      'ptt': 'audio',
      'document': 'file',
    };
    const newMediaType = typeMap[template.message_type] || 'image';
    setMediaType(newMediaType);
    setIsPtt(template.message_type === 'ptt');
    setMediaUrl(template.media_url || '');
    setCaption(template.content || '');
    setFilename(template.filename || '');
    clearFile();
  }
  toast.success(`Template "${template.name}" aplicado`);
};
```

**Nova função handleSaveTemplate:**
```typescript
const handleSaveTemplate = () => {
  if (activeTab === 'carousel') {
    if (carouselData.cards.length < 2) {
      toast.error('O carrossel precisa ter pelo menos 2 cards');
      return null;
    }
    const hasLocalFiles = carouselData.cards.some(card => card.imageFile);
    if (hasLocalFiles) {
      toast.error('Para salvar template de carrossel, use URLs para as imagens');
      return null;
    }
    return {
      name: '',
      content: carouselData.message || undefined,
      message_type: 'carousel',
      carousel_data: {
        message: carouselData.message,
        cards: carouselData.cards.map(card => ({
          ...card,
          imageFile: undefined,
        })),
      },
    };
  } else if (activeTab === 'text') {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      toast.error('Digite uma mensagem para salvar');
      return null;
    }
    return {
      name: '',
      content: trimmedMessage,
      message_type: 'text',
    };
  } else {
    const trimmedUrl = mediaUrl.trim();
    if (!trimmedUrl && !selectedFile) {
      toast.error('Selecione uma mídia para salvar');
      return null;
    }
    if (!trimmedUrl) {
      toast.error('Para salvar template de mídia, use uma URL');
      return null;
    }
    const sendType = mediaType === 'audio' && isPtt ? 'ptt' : mediaType === 'file' ? 'document' : mediaType;
    return {
      name: '',
      content: caption.trim() || undefined,
      message_type: sendType,
      media_url: trimmedUrl,
      filename: mediaType === 'file' ? filename.trim() : undefined,
    };
  }
};
```

**Adicionar o componente no JSX:**
Dentro do `CardHeader` do formulário de mensagem, adicionar o TemplateSelector:

```tsx
<CardHeader className="pb-3">
  <div className="flex items-center justify-between">
    <CardTitle className="text-lg flex items-center gap-2">
      <MessageSquare className="w-5 h-5" />
      Compor Mensagem
    </CardTitle>
    <TemplateSelector
      onSelect={handleSelectTemplate}
      onSave={handleSaveTemplate}
      disabled={isSending}
    />
  </div>
</CardHeader>
```

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────┐
│  Compor Mensagem          [Templates ▼] [💾] │
├─────────────────────────────────────────────┤
│  [Texto] [Mídia] [Carrossel]                │
├─────────────────────────────────────────────┤
│                                             │
│  Cards do carrossel (4/10)    [+ Add Card]  │
│  ┌─────────┐ ┌─────────┐                    │
│  │ Card 1  │ │ Card 2  │ ...                │
│  └─────────┘ └─────────┘                    │
│                                             │
└─────────────────────────────────────────────┘

Ao clicar em [💾]:
┌───────────────────────────────────┐
│  Salvar como Template             │
├───────────────────────────────────┤
│  Nome: [Promoção Carrossel      ] │
│  Categoria: [Marketing ▼] [+]    │
├───────────────────────────────────┤
│           [Cancelar] [Salvar]     │
└───────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/broadcast/TemplateSelector.tsx` | Adicionar `carousel_data` no tipo de retorno do `onSave` |
| `src/components/broadcast/LeadMessageForm.tsx` | Adicionar `TemplateSelector` com handlers para templates |

---

## Resultado Esperado

1. Usuários poderão salvar templates de carrossel no disparador de leads
2. Templates salvos poderão ser reutilizados em futuros envios
3. Interface consistente entre os dois disparadores (grupos e leads)
4. Carrosséis com URLs de imagem podem ser salvos como templates reutilizáveis

