

# Melhorar UX Mobile-First do Helpdesk

## Problema Atual

O layout do Helpdesk usa 3 colunas fixas (lista w-80 + chat flex-1 + info w-72) sem nenhuma adaptacao mobile. Em telas pequenas, tudo fica espremido e inutilizavel.

## Solucao: Navegacao por Views no Mobile

No mobile (< 768px), usar um sistema de views onde apenas uma coluna e visivel por vez:

```text
[Lista] --clica conversa--> [Chat] --clica info--> [Contato]
  ^                           |                       |
  |___________voltar__________|_______voltar__________|
```

No desktop (>= 768px), manter o layout atual de 3 colunas lado a lado.

## Mudancas por Arquivo

### 1. `src/pages/dashboard/HelpDesk.tsx`

- Adicionar estado `mobileView: 'list' | 'chat' | 'info'` (default: 'list')
- Usar `useIsMobile()` hook
- Ao selecionar conversa no mobile: setar `mobileView = 'chat'`
- Passar callback `onBack` para ChatPanel e ContactInfoPanel
- No mobile: renderizar condicionalmente apenas a view ativa (sem colunas fixas)
- No desktop: manter layout atual inalterado
- Mover o seletor de inbox para dentro do ConversationList no mobile (evitar barra extra)

### 2. `src/components/helpdesk/ChatPanel.tsx`

- Adicionar props `onBack?: () => void` e `onShowInfo?: () => void`
- No header: mostrar botao de voltar (ArrowLeft) quando `onBack` existir
- Adicionar botao de info/contato no header (User icon) que chama `onShowInfo`
- Ajustar padding e tamanhos para toque mobile

### 3. `src/components/helpdesk/ContactInfoPanel.tsx`

- Adicionar prop `onBack?: () => void`
- Mostrar botao de voltar no topo quando `onBack` existir

### 4. `src/components/helpdesk/ConversationList.tsx`

- Ajustar altura e padding para mobile
- Garantir que os items tenham area de toque suficiente (min 48px)

### 5. `src/components/helpdesk/ChatInput.tsx`

- Ajustar textarea e botoes para mobile (area de toque maior)
- Textarea com `text-base` no mobile para evitar zoom do iOS

## Detalhes Tecnicos

Estado de navegacao mobile no HelpDesk.tsx:

```typescript
const isMobile = useIsMobile();
const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');

const handleSelectConversation = (c: Conversation) => {
  setSelectedConversation(c);
  if (isMobile) setMobileView('chat');
};
```

Layout condicional:

```typescript
// Mobile: renderiza apenas a view ativa
{isMobile ? (
  mobileView === 'list' ? <ConversationList ... /> :
  mobileView === 'chat' ? <ChatPanel onBack={() => setMobileView('list')} onShowInfo={() => setMobileView('info')} ... /> :
  <ContactInfoPanel onBack={() => setMobileView('chat')} ... />
) : (
  // Desktop: layout 3 colunas atual
)}
```

## Resultado

- Mobile: navegacao fluida entre telas, area de toque adequada, sem scroll horizontal
- Desktop: layout inalterado, sem regressoes
- Sem alteracao de funcionalidades ou logica de negocio

