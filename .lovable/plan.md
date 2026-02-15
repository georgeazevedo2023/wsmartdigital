
# Adicionar Emoji Picker nas Composicoes de Texto

## Resumo
Adicionar um botao de emoji ao lado dos campos de texto (mensagem e legenda) nos formularios de composicao de mensagens, tanto no Disparador de Grupos quanto no Disparador de Leads e no envio individual para grupo.

## O que sera feito

1. **Criar componente `EmojiPicker`** - Um componente reutilizavel que exibe um popover com emojis organizados por categorias (Smileys, Gestos, Coracoes, Objetos, etc). Sera um picker nativo usando emojis Unicode, sem dependencia externa.

2. **Integrar nos 3 formularios:**
   - `BroadcastMessageForm.tsx` (Disparador de Grupos) - no campo de texto da mensagem e na legenda de midia
   - `LeadMessageForm.tsx` (Disparador de Leads) - no campo de texto da mensagem e na legenda de midia
   - `SendMessageForm.tsx` (Envio individual para grupo) - no campo de texto da mensagem

3. **Comportamento:**
   - Botao com icone de emoji (smile) posicionado ao lado do campo de texto
   - Ao clicar, abre um popover com grid de emojis
   - Ao selecionar um emoji, ele e inserido na posicao do cursor no textarea
   - Campo de busca para filtrar emojis

## Secao Tecnica

### Novo arquivo: `src/components/ui/emoji-picker.tsx`

Componente que usa o Popover do Radix UI (ja instalado) para exibir um grid de emojis populares organizados por categoria. Inclui:
- ~200 emojis populares organizados em categorias
- Campo de busca
- Tabs por categoria
- Callback `onEmojiSelect(emoji: string)` para inserir no texto

### Modificacoes nos formularios

Em cada formulario, adicionar um botao de emoji ao lado do textarea com a seguinte logica:

```text
+------------------------------------------+
| Mensagem                          0/4096 |
| +--------------------------------------+ |
| | [textarea]                           | |
| |                                      | |
| +--------------------------------------+ |
| [emoji-btn]                              |
+------------------------------------------+
```

- O botao de emoji usa o componente `EmojiPicker`
- Ao selecionar emoji, insere no final do texto atual (simples e confiavel)
- Aplicado tanto no campo "Mensagem" (tab Texto) quanto no campo "Legenda" (tab Midia)

### Arquivos modificados:
- `src/components/ui/emoji-picker.tsx` (novo)
- `src/components/broadcast/BroadcastMessageForm.tsx` (adicionar emoji picker nos campos de texto e legenda)
- `src/components/broadcast/LeadMessageForm.tsx` (adicionar emoji picker nos campos de texto e legenda)
- `src/components/group/SendMessageForm.tsx` (adicionar emoji picker no campo de texto)
