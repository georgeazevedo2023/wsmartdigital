

# Corrigir cabecalho do chat - uma unica linha sem seta e sem circulo duplicado

## Problemas identificados

1. **Seta do dropdown**: O componente `SelectTrigger` exibe automaticamente um icone de chevron (seta). Precisa ser removido.
2. **2 circulos verdes**: O circulo colorido aparece duas vezes - uma vez no `SelectTrigger` (linha 136-140) e outra vez dentro do `SelectItem` de "Aberta" (linha 145), que e renderizado pelo `SelectValue`. Resultado: dois circulos verdes.
3. **Layout em duas linhas**: Nome/telefone ficam em uma linha e o status em outra. Tudo deve ficar em uma unica linha.

## Solucao

Alterar o bloco de linhas 119-156 em `ChatPanel.tsx`:

1. **Remover a seta**: Adicionar a classe CSS para esconder o icone do chevron no `SelectTrigger` (`[&>svg:last-child]:hidden`)
2. **Remover o circulo duplicado**: Tirar o `span` com circulo colorido de dentro do `SelectTrigger` (linhas 136-140), pois o `SelectValue` ja renderiza o circulo que vem do `SelectItem`
3. **Tudo em uma linha**: Colocar nome, telefone e seletor de status no mesmo `flex` row, removendo a estrutura de duas linhas

## Detalhes tecnicos

**Arquivo**: `src/components/helpdesk/ChatPanel.tsx`

Estrutura final do cabecalho (simplificada):

```text
[Nome]  [Telefone]  [● Aberta v(sem seta)]
```

- Remover o wrapper `div` interno que criava duas linhas
- Usar um unico `flex items-center gap-2` para alinhar tudo horizontalmente
- No `SelectTrigger`: adicionar `[&>svg:last-child]:hidden` para esconder a seta
- No `SelectTrigger`: remover o `span` do circulo colorido (ele ja vem do `SelectValue`)

