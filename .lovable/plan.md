
# Scrollbars Discretas e Modernas

## O que será feito

Atualmente o projeto tem apenas a classe `.no-scrollbar` (que esconde a barra completamente). A imagem mostra uma barra de rolagem branca/clara que destoa do tema dark — visivelmente no painel de chat e na lista de conversas.

Vou adicionar regras CSS globais no `src/index.css` que estilizam todas as barras de rolagem do sistema para ficarem discretas, finas e alinhadas ao tema dark premium já existente.

---

## Estratégia visual

- **Largura fina**: `6px` (não `8px` padrão do browser)
- **Cor da track**: totalmente transparente (track invisível)
- **Cor do thumb**: `hsl(220 16% 30% / 0.5)` — cinza-azulado escuro com 50% de opacidade, quase invisível no fundo dark
- **Hover**: sobe para `hsl(220 16% 40% / 0.7)` — fica um pouco mais visível só quando o usuário está usando
- **Bordas arredondadas**: `border-radius: 999px` para visual pill/moderno
- **Comportamento Firefox**: usa `scrollbar-width: thin` e `scrollbar-color` (API moderna)

---

## Arquivo a modificar

### `src/index.css`

Adicionar ao final do arquivo, fora dos `@layer`, para garantir que as regras se apliquem globalmente:

```css
/* ===== SCROLLBAR GLOBAL — Discreta e Moderna ===== */

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: hsl(220 16% 30% / 0.4) transparent;
}

/* Chrome, Safari, Edge */
*::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: hsl(220 16% 30% / 0.45);
  border-radius: 999px;
}

*::-webkit-scrollbar-thumb:hover {
  background: hsl(220 16% 42% / 0.7);
}

*::-webkit-scrollbar-corner {
  background: transparent;
}
```

---

## Resultado esperado

| Antes | Depois |
|---|---|
| Barra branca/clara larga e visualmente pesada | Barra cinza-azulada fina (5px), quase invisível |
| Track (trilho) branca ou cinza claro | Track completamente transparente |
| Sem hover effect | Ligeiramente mais visível ao passar o mouse |

A mudança afeta todo o app (lista de conversas, painel de chat, painel admin, etc.) de forma consistente com o tema dark.
