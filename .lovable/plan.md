

# Painel de Contato Retraivel no Desktop

## Objetivo

No layout desktop, a coluna direita (info do contato) ficara retraida por padrão. Um botao de seta no header do chat permitira abrir/fechar o painel. Isso maximiza o espaco do chat e melhora o aproveitamento de tela.

## Comportamento

```text
Estado normal (retraido):
[Lista w-80] [Chat - tela cheia .......................... >]

Ao clicar na seta (expandido):
[Lista w-80] [Chat ..................] [Info w-72]
```

- O botao de seta (ChevronRight / ChevronLeft) fica no header do ChatPanel, ao lado do nome do contato
- Clicar alterna entre mostrar/esconder o painel de info
- No mobile, o comportamento atual de views separadas permanece inalterado

## Mudancas por Arquivo

### 1. `src/pages/dashboard/HelpDesk.tsx`

- Adicionar estado `showContactInfo` (default: `false`)
- Passar prop `onToggleInfo` e `showingInfo` para o ChatPanel no layout desktop
- Condicionar a renderizacao da coluna direita ao estado `showContactInfo`

### 2. `src/components/helpdesk/ChatPanel.tsx`

- Adicionar props `onToggleInfo?: () => void` e `showingInfo?: boolean`
- No header, ao lado do nome do contato (lado direito), mostrar um botao com icone de seta:
  - `PanelRightOpen` quando retraido (para indicar que pode abrir)
  - `PanelRightClose` quando expandido (para indicar que pode fechar)
- O botao so aparece no desktop (quando `onToggleInfo` existe e nao ha `onShowInfo` de mobile)

## Detalhes Tecnicos

No HelpDesk.tsx, o layout desktop muda de:

```typescript
// Antes: info sempre visivel
{selectedConversation && (
  <div className="w-72 ...">
    <ContactInfoPanel ... />
  </div>
)}
```

Para:

```typescript
// Depois: info controlada por estado
const [showContactInfo, setShowContactInfo] = useState(false);

<ChatPanel
  ...
  onToggleInfo={() => setShowContactInfo(prev => !prev)}
  showingInfo={showContactInfo}
/>

{selectedConversation && showContactInfo && (
  <div className="w-72 ...">
    <ContactInfoPanel ... />
  </div>
)}
```

No ChatPanel.tsx, adicionar o botao de toggle no header:

```typescript
{onToggleInfo && (
  <Button variant="ghost" size="icon" onClick={onToggleInfo}>
    {showingInfo ? <PanelRightClose /> : <PanelRightOpen />}
  </Button>
)}
```

## Resultado

- Chat ocupa toda a largura disponivel por padrao (melhor aproveitamento de tela)
- Painel de contato acessivel com um clique na seta
- Mobile inalterado (continua com navegacao por views)
- Sem alteracao de funcionalidades
