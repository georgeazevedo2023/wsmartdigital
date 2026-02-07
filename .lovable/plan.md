
# Responsividade Mobile-First para o Dashboard

## Problema Identificado

Na imagem fornecida, o sidebar fixo ocupa espaço horizontal em dispositivos mobile, comprimindo severamente o conteudo principal. O layout atual (`flex h-screen`) mantém o sidebar sempre visível, independente do tamanho da tela.

---

## Solucao Proposta

Implementar um sistema de navegacao responsivo com duas abordagens:

1. **Desktop (>= 768px)**: Sidebar fixo lateral (comportamento atual)
2. **Mobile (< 768px)**: Sidebar oculto por padrao, acessivel via botao hamburguer + Sheet (drawer lateral)

---

## Arquitetura da Solucao

```text
+------------------+     +------------------+
|  DESKTOP >= 768  |     |   MOBILE < 768   |
+------------------+     +------------------+
| [Sidebar] [Main] |     | [Header + Menu]  |
|                  |     | [Main Content ]  |
+------------------+     +------------------+
```

---

## Alteracoes Detalhadas

### 1. DashboardLayout.tsx

**Mudancas:**
- Importar `useIsMobile` e componentes Sheet (drawer)
- Estado `mobileMenuOpen` para controlar abertura do menu
- Renderizacao condicional:
  - Desktop: Sidebar fixo (atual)
  - Mobile: Header com botao menu + Sheet contendo a navegacao

```text
Mobile Layout:
+--------------------------------+
| [Logo] [MENU BTN]              | <- Header fixo
+--------------------------------+
|                                |
|        Main Content            | <- Scroll independente
|        (padding top)           |
|                                |
+--------------------------------+
```

### 2. Sidebar.tsx

**Mudancas:**
- Receber prop `isMobile?: boolean` para ajustar estilos
- No mobile, remover largura fixa e usar `w-full`
- Callback `onNavigate` para fechar o menu apos selecao de rota (mobile)
- Esconder botao de colapsar no mobile (desnecessario em drawer)

### 3. Ajustes de Padding nas Paginas

**Mudancas:**
- Verificar se as paginas tem padding adequado para mobile
- Usar classes responsivas como `p-4 md:p-6`
- Garantir que cards e grids se adaptem (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)

### 4. Componentes de Broadcast

**Mudancas no Broadcaster.tsx e similares:**
- Progress steps: empilhar verticalmente no mobile
- Botoes: usar `flex-col gap-2` no mobile, `flex-row` no desktop
- Cards: garantir `max-w-full` e sem overflow horizontal

### 5. Header Mobile (novo componente)

**Criar `MobileHeader.tsx`:**
- Altura fixa (~56px)
- Logo a esquerda
- Botao hamburguer a direita
- Background glassmorphism consistente com o tema

---

## Arquivos a Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/components/dashboard/DashboardLayout.tsx` | Modificar | Adicionar logica mobile + Sheet |
| `src/components/dashboard/Sidebar.tsx` | Modificar | Aceitar props mobile + callback |
| `src/pages/dashboard/Broadcaster.tsx` | Modificar | Responsividade dos steps e botoes |
| `src/pages/dashboard/DashboardHome.tsx` | Modificar | Ajustar grid de stats cards |
| `src/pages/dashboard/Instances.tsx` | Modificar | Ajustar grid e dialogs |
| `src/components/broadcast/GroupSelector.tsx` | Modificar | Ajustar botoes de selecao |
| `src/components/broadcast/BroadcasterHeader.tsx` | Modificar | Layout responsivo |

---

## Beneficios

1. **Melhor UX mobile**: Conteudo ocupa 100% da largura em dispositivos pequenos
2. **Navegacao acessivel**: Menu sempre disponivel via botao
3. **Consistencia visual**: Mesmo tema glassmorphism no drawer mobile
4. **Performance**: Sidebar nao renderizado desnecessariamente no mobile
5. **Acessibilidade**: Touch targets maiores, espacamento adequado

---

## Detalhes Tecnicos

### Hook useIsMobile

Ja existe em `src/hooks/use-mobile.tsx` com breakpoint 768px. Sera reutilizado.

### Sheet Component

Ja existe em `src/components/ui/sheet.tsx`. Sera usado para o drawer mobile.

### Classes Tailwind Responsivas

```css
/* Exemplo de padroes a usar */
.container { @apply p-4 md:p-6 }
.grid { @apply grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 }
.button-group { @apply flex flex-col sm:flex-row gap-2 }
```

### Animacao de Transicao

O Sheet ja possui animacoes suaves. O header mobile tera transicao de abertura consistente.
