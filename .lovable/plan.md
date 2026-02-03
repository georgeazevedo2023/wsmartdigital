
# Adicionar Suporte a Carrossel no Disparador de Leads

## Resumo
Adicionar a aba "Carrossel" no formulário de mensagens do Disparador de Leads, permitindo enviar carrosséis interativos (cards com imagens, texto e botões) para contatos individuais, replicando a funcionalidade já existente no Disparador de Grupos.

---

## Componentes Envolvidos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/broadcast/LeadMessageForm.tsx` | Adicionar aba Carrossel, estado, função de envio e log |
| `src/pages/dashboard/LeadsBroadcaster.tsx` | Atualizar interface `ResendData` para incluir `carouselData` |

---

## Alterações Detalhadas

### 1. LeadMessageForm.tsx

#### 1.1 Importações Adicionais
```typescript
import { CarouselEditor, CarouselData, createEmptyCard } from './CarouselEditor';
import { CarouselPreview } from './CarouselPreview';
import { LayoutGrid } from 'lucide-react';
```

#### 1.2 Atualizar Tipos
```typescript
// Atualizar ActiveTab para incluir 'carousel'
type ActiveTab = 'text' | 'media' | 'carousel';

// Atualizar interface InitialData para incluir carouselData
interface InitialData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  carouselData?: {
    message?: string;
    cards?: Array<{
      id?: string;
      text?: string;
      image?: string;
      buttons?: Array<{
        id?: string;
        type: 'URL' | 'REPLY' | 'CALL';
        label: string;
        value?: string;
      }>;
    }>;
  };
}
```

#### 1.3 Adicionar Estado do Carrossel
```typescript
// Inicializar carouselData a partir de initialData (para reenvio)
const [carouselData, setCarouselData] = useState<CarouselData>(() => {
  if (initialData?.carouselData && initialData.carouselData.cards) {
    return {
      message: initialData.carouselData.message || '',
      cards: initialData.carouselData.cards.map((card) => ({
        id: card.id || crypto.randomUUID(),
        text: card.text || '',
        image: card.image || '',
        buttons: card.buttons?.map((btn) => ({
          id: btn.id || crypto.randomUUID(),
          type: btn.type,
          label: btn.label,
          url: btn.type === 'URL' ? (btn.value || '') : '',
          phone: btn.type === 'CALL' ? (btn.value || '') : '',
        })) || [],
      })),
    };
  }
  return {
    message: '',
    cards: [createEmptyCard(), createEmptyCard()],
  };
});
```

#### 1.4 Atualizar activeTab inicial
```typescript
const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
  if (initialData?.messageType === 'carousel') return 'carousel';
  if (initialData?.messageType && initialData.messageType !== 'text') return 'media';
  return 'text';
});
```

#### 1.5 Adicionar Função sendCarouselToNumber
```typescript
const sendCarouselToNumber = async (
  jid: string, 
  carousel: CarouselData,
  accessToken: string
) => {
  // Converter arquivos locais para base64
  const processedCards = await Promise.all(
    carousel.cards.map(async (card) => {
      let imageUrl = card.image;
      if (card.imageFile) {
        imageUrl = await fileToBase64(card.imageFile);
        const base64Data = imageUrl.split(',')[1] || imageUrl;
        imageUrl = base64Data;
      }
      return {
        text: card.text,
        image: imageUrl,
        buttons: card.buttons,
      };
    })
  );

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'send-carousel',
        token: instance.token,
        groupjid: jid,
        message: carousel.message,
        carousel: processedCards,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Erro ao enviar carrossel');
  }

  return response.json();
};
```

#### 1.6 Adicionar Função handleSendCarousel
```typescript
const handleSendCarousel = async () => {
  // Validação básica
  const hasValidCard = carouselData.cards.some(c => 
    (c.image || c.imageFile) && c.text.trim()
  );
  
  if (!hasValidCard) {
    toast.error('Preencha pelo menos um card com imagem e texto');
    return;
  }

  const session = await supabase.auth.getSession();
  if (!session.data.session) {
    toast.error('Sessão expirada');
    return;
  }

  const accessToken = session.data.session.access_token;
  const startedAt = Date.now();

  isPausedRef.current = false;
  isCancelledRef.current = false;

  setProgress({
    current: 0,
    total: selectedLeads.length,
    currentName: '',
    status: 'sending',
    results: [],
    startedAt,
  });

  const results: SendProgress['results'] = [];

  for (let i = 0; i < selectedLeads.length; i++) {
    if (isCancelledRef.current) {
      setProgress(p => ({ ...p, status: 'cancelled' }));
      toast.warning('Envio cancelado');
      break;
    }

    await waitWhilePaused();

    const lead = selectedLeads[i];
    const displayName = lead.name || lead.phone;

    setProgress(p => ({
      ...p,
      current: i + 1,
      currentName: displayName,
    }));

    try {
      await sendCarouselToNumber(lead.jid, carouselData, accessToken);
      results.push({ name: displayName, success: true });
    } catch (error: any) {
      results.push({ name: displayName, success: false, error: error.message });
    }

    setProgress(p => ({ ...p, results: [...results] }));

    if (i < selectedLeads.length - 1 && !isCancelledRef.current) {
      await delay(getRandomDelay());
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  if (!isCancelledRef.current) {
    setProgress(p => ({
      ...p,
      status: failCount > 0 ? 'error' : 'success',
    }));

    if (failCount === 0) {
      toast.success(`Carrossel enviado para ${successCount} contato${successCount !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`${successCount} enviados, ${failCount} falharam`);
    }
  }

  // Salvar log com carouselData
  const leadNames = selectedLeads.slice(0, 50).map(l => l.name || l.phone);
  await saveBroadcastLogWithCarousel({
    messageType: 'carousel',
    content: carouselData.message || null,
    mediaUrl: null,
    recipientsTargeted: selectedLeads.length,
    recipientsSuccess: successCount,
    recipientsFailed: failCount,
    status: isCancelledRef.current ? 'cancelled' : (failCount > 0 ? 'error' : 'completed'),
    startedAt,
    leadNames,
    carouselData,
  });
};
```

#### 1.7 Atualizar saveBroadcastLog para suportar carouselData
Adicionar parâmetro opcional `carouselData` à função `saveBroadcastLog` e incluir no insert:
```typescript
carousel_data: params.carouselData ? {
  message: params.carouselData.message,
  cards: params.carouselData.cards.map(card => ({
    id: card.id,
    text: card.text,
    image: card.image || '', // Não salvar base64 grande
    buttons: card.buttons.map(btn => ({
      id: btn.id,
      type: btn.type,
      label: btn.label,
      value: btn.url || btn.phone || '',
    })),
  })),
} : null,
```

#### 1.8 Atualizar handleSend
```typescript
const handleSend = async () => {
  if (activeTab === 'text') {
    await handleSendText();
  } else if (activeTab === 'carousel') {
    await handleSendCarousel();
  } else {
    await handleSendMedia();
  }
};
```

#### 1.9 Atualizar canSend
```typescript
const canSend = activeTab === 'text' 
  ? message.trim().length > 0
  : activeTab === 'carousel'
    ? carouselData.cards.some(c => (c.image || c.imageFile) && c.text.trim())
    : (selectedFile || mediaUrl.trim());
```

#### 1.10 Atualizar UI - TabsList para 3 colunas
```tsx
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="text" className="gap-2">
    <MessageSquare className="w-4 h-4" />
    Texto
  </TabsTrigger>
  <TabsTrigger value="media" className="gap-2">
    <Image className="w-4 h-4" />
    Mídia
  </TabsTrigger>
  <TabsTrigger value="carousel" className="gap-2">
    <LayoutGrid className="w-4 h-4" />
    Carrossel
  </TabsTrigger>
</TabsList>
```

#### 1.11 Adicionar TabsContent para Carrossel
```tsx
<TabsContent value="carousel" className="space-y-4 mt-4">
  <CarouselEditor
    value={carouselData}
    onChange={setCarouselData}
    disabled={isSending}
  />
</TabsContent>
```

#### 1.12 Atualizar Preview para mostrar Carrossel
```tsx
{activeTab === 'carousel' ? (
  <CarouselPreview message={carouselData.message} cards={carouselData.cards} />
) : (
  <MessagePreview
    type={activeTab === 'text' ? 'text' : mediaType}
    text={activeTab === 'text' ? message : caption}
    previewUrl={previewUrl}
    mediaUrl={activeTab === 'media' ? mediaUrl : undefined}
    filename={filename}
    isPtt={isPtt}
  />
)}
```

---

### 2. LeadsBroadcaster.tsx

#### 2.1 Atualizar interface ResendData
```typescript
interface ResendData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  instanceId: string;
  instanceName: string | null;
  carouselData?: {
    message?: string;
    cards?: Array<{
      id?: string;
      text?: string;
      image?: string;
      buttons?: Array<{
        id?: string;
        type: 'URL' | 'REPLY' | 'CALL';
        label: string;
        value?: string;
      }>;
    }>;
  };
}
```

---

## Fluxo de Funcionamento

```text
+-------------------+     +-------------------+     +-------------------+
| 1. Selecionar     | --> | 2. Selecionar     | --> | 3. Compor         |
|    Instância      |     |    Base + Leads   |     |    Mensagem       |
+-------------------+     +-------------------+     +-------------------+
                                                           |
                                                           v
                                              +-------------------------+
                                              | Tabs:                   |
                                              | [Texto] [Mídia] [Carrossel] |
                                              +-------------------------+
                                                           |
                                                           v
                                              +-------------------------+
                                              | CarouselEditor:         |
                                              | - Mensagem principal    |
                                              | - 2-10 Cards            |
                                              | - Cada card: imagem,    |
                                              |   texto, botões         |
                                              +-------------------------+
                                                           |
                                                           v
                                              +-------------------------+
                                              | Envio sequencial:       |
                                              | Lead 1 -> delay ->      |
                                              | Lead 2 -> delay -> ...  |
                                              +-------------------------+
```

---

## Resultado Esperado

1. Nova aba "Carrossel" visível no formulário de mensagens do Disparador de Leads
2. Editor visual idêntico ao do Disparador de Grupos (2-10 cards, botões interativos)
3. Preview em tempo real do carrossel
4. Envio sequencial com delay anti-bloqueio
5. Registro no histórico com `message_type: 'carousel'` e `carousel_data` persistido
6. Reenvio funcional a partir do histórico (carrega dados do carrossel no editor)

---

## Testes Recomendados

1. Criar carrossel com 3 cards e enviar para 2-3 leads
2. Verificar se aparece no histórico com badge "Carrossel"
3. Testar reenvio a partir do histórico
4. Testar pausar/cancelar durante envio de carrossel
5. Verificar validação (cards sem imagem/texto devem bloquear envio)
