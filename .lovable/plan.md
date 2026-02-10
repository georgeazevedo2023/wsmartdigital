

# Corrigir Cliques Bloqueados pelo Overlay Aurora

## Causa Raiz

O problema NAO e com as abas em si. O pseudo-elemento `bg-aurora::before` no CSS global cria uma camada invisivel (`position: absolute; inset: 0;`) sobre todo o conteudo da pagina. Como nao tem `pointer-events: none`, esse overlay intercepta todos os cliques, impedindo qualquer interacao com botoes, abas, links, etc.

Isso explica por que o problema persistiu mesmo apos trocar Radix Tabs por botoes nativos -- a causa sempre foi o CSS, nao o componente.

## Solucao

Adicionar `pointer-events: none;` ao pseudo-elemento `.bg-aurora::before` no arquivo `src/index.css`. Isso permite que os cliques passem pela camada de animacao e cheguem aos elementos interativos.

## Alteracao

### `src/index.css` (linha 166-176)

Adicionar uma unica linha ao bloco `.bg-aurora::before`:

```css
.bg-aurora::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;  /* <-- ADICIONAR ESTA LINHA */
  background: ...
  animation: ...
}
```

Nenhuma outra alteracao e necessaria. Os botoes customizados de navegacao que ja foram implementados continuarao funcionando normalmente assim que o overlay parar de bloquear os cliques.

