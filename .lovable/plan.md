

# Unificar header do Helpdesk em uma unica linha moderna

## Problema atual

O helpdesk tem dois blocos separados ocupando espaco vertical:
1. Um header "Atendimento" com icones de etiquetas, sync e badge de contagem (dentro do `ConversationList`)
2. Uma barra separada "Caixa: [dropdown]" (renderizada no `HelpDesk.tsx` acima do conteudo principal)

Isso consome espaco desnecessario e fragmenta visualmente o cabecalho.

## Solucao

Criar um header unico e compacto no topo do helpdesk que contenha todos os elementos em uma unica linha:

```text
Atendimento  [icone etiquetas] [icone sync] [badge 196]  ----  Caixa: [Neo Blindados - Geral v]
```

- Lado esquerdo: titulo "Atendimento", botoes de etiquetas e sync, badge de contagem
- Lado direito: seletor de inbox

## Alteracoes

### 1. `src/pages/dashboard/HelpDesk.tsx`
- Remover o bloco `inboxSelector` separado (linhas 348-364) que renderiza a barra "Caixa:" como elemento independente
- Criar um novo header unificado no topo do layout (antes do bloco principal `flex`) que combina:
  - Titulo "Atendimento"
  - Botoes de etiquetas e sync (movidos de ConversationList)
  - Badge de contagem de nao-lidos
  - Seletor de inbox (movido da barra separada)
- Ajustar a altura do container principal para compensar o header unico (ex: `h-[calc(100vh-4rem)]` -> `h-[calc(100vh-4rem)]` mantendo o mesmo, pois o header sera mais compacto)

### 2. `src/components/helpdesk/ConversationList.tsx`
- Remover o bloco de header (linhas 63-96) que contem titulo "Atendimento", botoes de icones e badge
- O componente comeca direto com os status tabs e busca
- Ajustar props: mover `onSync`, `syncing`, `inboxId`, `onLabelsChanged` para o componente pai (HelpDesk) que agora gerencia esses botoes no header unificado

### 3. Estilo do header unificado
- Usar `flex items-center justify-between` para distribuir elementos
- Padding compacto (`px-4 py-2`)
- Fundo sutil com borda inferior (`border-b border-border/50 bg-card/50`)
- Badge de contagem com estilo existente (verde/primary, rounded-full)
- Seletor de inbox sem borda visual excessiva, integrado ao header

## Resultado esperado
- Ganho de ~40px de area util vertical
- Visual mais limpo e profissional
- Todos os controles principais acessiveis em um unico local
- Melhor UX com informacoes consolidadas
