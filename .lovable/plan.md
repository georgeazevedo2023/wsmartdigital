

# Remover botao voltar flutuante redundante

## O que fazer

Agora que o header do chat esta visivel no mobile (com a seta voltar ao lado do nome "George"), o botao flutuante fixo que adicionamos anteriormente e redundante e deve ser removido.

## Alteracao tecnica

### `src/components/helpdesk/ChatPanel.tsx`

Remover o bloco do botao flutuante fixo (linhas 124-132 aproximadamente):

```typescript
// REMOVER este bloco inteiro:
{onBack && (
  <button
    onClick={onBack}
    className="fixed top-4 left-4 z-50 h-12 w-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center md:hidden"
  >
    <ArrowLeft className="w-6 h-6" />
  </button>
)}
```

## Arquivos afetados

- `src/components/helpdesk/ChatPanel.tsx` - remover botao flutuante fixo

