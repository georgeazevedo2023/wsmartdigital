
# Correção: Ícone Duplicado no Seletor de Tipo de Botão

## Problema Identificado
O seletor de tipo de botão está exibindo dois ícones porque:

1. O `SelectTrigger` renderiza o ícone via `getButtonIcon(button.type)` 
2. O `SelectValue` também renderiza o conteúdo do `SelectItem` selecionado, que inclui outro ícone

## Solução
Remover os ícones dentro dos `SelectItem` e deixar apenas texto. O ícone no trigger já mostra o tipo selecionado de forma visual.

## Mudança no Código

**Arquivo:** `src/components/broadcast/CarouselButtonEditor.tsx`

De:
```tsx
<SelectItem value="URL">
  <div className="flex items-center gap-2">
    <Link className="w-3.5 h-3.5" />
    URL
  </div>
</SelectItem>
<SelectItem value="REPLY">
  <div className="flex items-center gap-2">
    <MessageSquare className="w-3.5 h-3.5" />
    Resposta
  </div>
</SelectItem>
<SelectItem value="CALL">
  <div className="flex items-center gap-2">
    <Phone className="w-3.5 h-3.5" />
    Ligar
  </div>
</SelectItem>
```

Para:
```tsx
<SelectItem value="URL">URL</SelectItem>
<SelectItem value="REPLY">Resposta</SelectItem>
<SelectItem value="CALL">Ligar</SelectItem>
```

## Resultado Esperado

```
Antes:  [🔗 🔗 URL ▼]  (ícone duplicado)
Depois: [🔗 URL ▼]     (apenas um ícone)
```

O ícone à esquerda (do trigger) continua indicando visualmente o tipo, e o texto mostra o nome da opção.
