

# Corrigir botao voltar no mobile do Helpdesk

## Problema

No mobile, o header do chat (que contem o botao voltar, nome do contato e status) esta sendo cortado/escondido pela barra de endereco do navegador. O botao de voltar existe no codigo mas fica inacessivel visualmente.

## Causa raiz

O container do chat no mobile (`mobileView === 'chat'`) nao tem nenhum padding superior ou safe-area inset. O header `h-14` fica colado no topo e e encoberto pela interface do navegador mobile.

## Solucao

### 1. Adicionar safe-area e destaque ao header do ChatPanel (`ChatPanel.tsx`)

- Aumentar o destaque visual do header no mobile com um background mais solido
- Adicionar `pt-safe` ou padding extra no topo para evitar sobreposicao com a barra do navegador

### 2. Ajustar container mobile no HelpDesk.tsx

No bloco `mobileView === 'chat'` (linhas 440-452), o container usa `h-[calc(100vh-4rem)]` herdado do pai, mas dentro dele nao ha protecao para safe areas. Adicionar `safe-area-inset` ao container do chat.

## Alteracoes tecnicas

### `src/components/helpdesk/ChatPanel.tsx`
- Aumentar o tamanho do botao de voltar de `h-9 w-9` para `h-10 w-10` com icone maior
- Tornar o background do header mais solido: `bg-card` em vez de `bg-card/50`
- Aumentar a altura do header de `h-14` para `h-16` no mobile para dar mais espaco ao toque

### `src/pages/dashboard/HelpDesk.tsx`
- No container mobile do chat (linha 441), adicionar uma classe de padding-top seguro para evitar sobreposicao com a barra do navegador

## Arquivos afetados

- `src/components/helpdesk/ChatPanel.tsx` - header mais visivel e acessivel
- `src/pages/dashboard/HelpDesk.tsx` - safe area no container mobile do chat

