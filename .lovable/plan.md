

## Documentação do Disparador — Sub-módulo em Administração

### Visão Geral

Criar uma nova aba "Documentação" no Painel de Administração que gera e disponibiliza para download um arquivo Markdown completo com toda a documentação técnica do módulo Disparador.

### Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/components/admin/BroadcasterDocsTab.tsx` |
| Editar | `src/pages/dashboard/AdminPanel.tsx` |

### 1. `BroadcasterDocsTab.tsx` (~120 linhas)

Componente que exibe a documentação em formato legível na tela e oferece botão de download como `.md`.

**Conteúdo da documentação gerada:**

1. **Visão Geral do Módulo** — Descrição do Disparador (grupos e leads), tipos de mensagem suportados (texto, mídia, carrossel)
2. **Arquitetura de Código** — Mapa de todos os arquivos com descrição:
   - Páginas: `Broadcaster.tsx`, `LeadsBroadcaster.tsx`, `BroadcastHistoryPage.tsx`
   - Hooks: `useBroadcastForm.ts`, `useBroadcastSend.ts`, `useBroadcastMedia.ts`, `useBroadcastCarousel.ts`, `useLeadMessageForm.ts`, `useLeadsBroadcaster.ts`, `useBroadcastHistory.ts`, `useLeadImport.ts`
   - Componentes: todos em `src/components/broadcast/`
   - Utilitários: `uazapiProxy.ts`, `saveToHelpdesk.ts`, `uploadCarouselImage.ts`
3. **Tabelas do Banco de Dados** — Schema completo de `broadcast_logs`, `lead_databases`, `lead_database_entries`, `scheduled_messages`, `scheduled_message_logs` com colunas, tipos e RLS
4. **Storage Buckets** — `carousel-images` (público)
5. **Endpoints UAZAPI (via proxy)** — Documentação das actions:
   - `send-message` → `/send/text`
   - `send-media` → `/send/media`
   - `send-carousel` → `/send/carousel`
   - `send-chat` → `/send/text` (chat direto)
   - `send-audio` → `/send/audio`
   - `check-numbers` → `/chat/check`
   - Payload de cada endpoint, normalização, validação SSRF
6. **Fluxo de Envio** — Diagrama do loop unificado (`runSendLoop`): deduplicação, delays, pause/resume/cancel, log de broadcast
7. **Constantes e Limites** — `MAX_MESSAGE_LENGTH`, `MAX_FILE_SIZE`, delays, tipos permitidos
8. **Integração com Helpdesk** — `saveToHelpdesk` e sincronização de mensagens enviadas
9. **Agendamento** — Como funciona o `scheduled_messages` + edge function `process-scheduled-messages`

O conteúdo será uma string template literal dentro do componente, renderizado com `prose` styling e com botão para download via `Blob` + `URL.createObjectURL`.

### 2. Edição em `AdminPanel.tsx`

- Adicionar aba "Documentação" (ícone `FileText`) ao `TabsList`
- Adicionar `TabsContent` que renderiza `<BroadcasterDocsTab />`

### Detalhes técnicos

- O download será feito client-side criando um `Blob` com o conteúdo Markdown e disparando um click em um `<a>` temporário
- A documentação será renderizada na tela usando `whitespace-pre-wrap` dentro de um card com scroll
- Sem dependência de backend — tudo é estático no componente

