
# Corrigir Funcionalidade de Reenvio do Histórico

## Problema Identificado

A funcionalidade de **reenviar mensagem a partir do histórico** não está funcionando porque os dados do carrossel (e a mensagem para outros tipos) **não estão sendo passados corretamente pela cadeia de componentes**.

### Fluxo Atual (Quebrado)

```
BroadcastHistory.tsx          BroadcastHistoryPage.tsx       Broadcaster.tsx              BroadcastMessageForm.tsx
      |                              |                             |                              |
 onResend(log)  ───────>  sessionStorage.setItem()  ───>  resendData  ───────>  initialData
      |                              |                             |                              |
 [log completo]           [SEM carousel_data!]           [SEM carousel_data!]           [carouselData vazio]
```

### Problemas Específicos

1. **BroadcastHistoryPage.tsx (linha 15-21)**: Não inclui `carousel_data` no `resendData`
2. **Broadcaster.tsx (linha 12-18)**: Interface `ResendData` não tem campo para `carouselData`
3. **Broadcaster.tsx (linha 271-275)**: `initialData` passado para o form não inclui carrossel
4. **BroadcastMessageForm.tsx (linha 117-120)**: Estado `carouselData` não é inicializado com `initialData`

---

## Solução Proposta

### 1. Atualizar Interface e Armazenamento no BroadcastHistoryPage

Modificar o `handleResend` para incluir `carousel_data`:

```typescript
sessionStorage.setItem('resendData', JSON.stringify({
  messageType: log.message_type,
  content: log.content,
  mediaUrl: log.media_url,
  instanceId: log.instance_id,
  instanceName: log.instance_name,
  carouselData: log.carousel_data, // ADICIONAR
}));
```

### 2. Atualizar Interface ResendData no Broadcaster

```typescript
interface ResendData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  instanceId: string;
  instanceName: string | null;
  carouselData?: any; // ADICIONAR
}
```

### 3. Passar carouselData para BroadcastMessageForm

No `Broadcaster.tsx`, atualizar o `initialData`:

```typescript
initialData={resendData ? {
  messageType: resendData.messageType,
  content: resendData.content,
  mediaUrl: resendData.mediaUrl,
  carouselData: resendData.carouselData, // ADICIONAR
} : undefined}
```

### 4. Atualizar Interface InitialData no BroadcastMessageForm

```typescript
interface InitialData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  carouselData?: any; // ADICIONAR
}
```

### 5. Inicializar carouselData com Dados do Histórico

Atualizar o estado inicial do carrossel:

```typescript
const [carouselData, setCarouselData] = useState<CarouselData>(() => {
  if (initialData?.carouselData) {
    // Converter formato do histórico para formato do editor
    return {
      message: initialData.carouselData.message || '',
      cards: initialData.carouselData.cards.map((card: any) => ({
        id: card.id || crypto.randomUUID(),
        text: card.text || '',
        image: card.image || '',
        buttons: card.buttons?.map((btn: any) => ({
          id: btn.id || crypto.randomUUID(),
          type: btn.type,
          label: btn.label,
          url: btn.type === 'URL' ? btn.value : '',
          phone: btn.type === 'CALL' ? btn.value : '',
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

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `BroadcastHistoryPage.tsx` | Adicionar `carouselData` ao sessionStorage |
| `Broadcaster.tsx` | Atualizar interface e passar carouselData |
| `BroadcastMessageForm.tsx` | Atualizar interface e inicializar carouselData |

---

## Resultado Esperado

Após as modificações:
- Ao clicar em "Reenviar" em uma mensagem de carrossel do histórico
- O formulário será pré-preenchido com:
  - Tab "Carrossel" selecionada automaticamente
  - Mensagem principal do carrossel
  - Todos os cards com textos e botões
  - Imagens em miniatura como preview (nota: novas imagens precisam ser selecionadas para envio, pois apenas thumbnails são salvos)
