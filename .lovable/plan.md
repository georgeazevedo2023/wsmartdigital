
# Corrigir e Melhorar Funcionalidade "Reenviar" do Histórico

## Problema Identificado

O botão "Reenviar" no histórico de envios não está funcionando corretamente por dois motivos:

1. **Bug no LeadsBroadcaster**: Os dados do carrossel (`carouselData`) não estão sendo passados para o formulário de mensagem
2. **Experiência confusa**: Após clicar em "Reenviar", o usuário ainda precisa passar por todas as etapas de seleção

---

## Solução Proposta

### Correção 1: Passar carouselData para LeadMessageForm

**Arquivo:** `src/pages/dashboard/LeadsBroadcaster.tsx`

Na linha 808-812, o `carouselData` está sendo omitido. Corrigir para:

```typescript
initialData={resendData ? {
  messageType: resendData.messageType,
  content: resendData.content,
  mediaUrl: resendData.mediaUrl,
  carouselData: resendData.carouselData,  // <- Adicionar esta linha
} : undefined}
```

---

### Correção 2: Criar Modal de Opções de Reenvio

Criar um novo componente `ResendOptionsDialog` que aparece ao clicar em "Reenviar" no histórico, permitindo:

1. **Escolher destino**: Grupos ou Leads
2. **Excluir admins**: Sim/Não (apenas para grupos)
3. **Confirmar e redirecionar**

**Novo arquivo:** `src/components/broadcast/ResendOptionsDialog.tsx`

O componente incluirá:
- Radio buttons para escolher entre "Grupos" e "Leads"
- Toggle para "Excluir Admins/Owners" (visível apenas quando Grupos está selecionado)
- Botões de ação: Cancelar e Reenviar

---

### Correção 3: Atualizar BroadcastHistory para usar o Dialog

**Arquivo:** `src/components/broadcast/BroadcastHistory.tsx`

- Adicionar estado para controlar o dialog de reenvio
- Armazenar o log selecionado para reenvio
- Renderizar o novo `ResendOptionsDialog`

---

### Correção 4: Atualizar BroadcastHistoryPage para receber opções

**Arquivo:** `src/pages/dashboard/BroadcastHistoryPage.tsx`

Atualizar o `handleResend` para incluir as opções selecionadas:

```typescript
sessionStorage.setItem('resendData', JSON.stringify({
  messageType: log.message_type,
  content: log.content,
  mediaUrl: log.media_url,
  instanceId: log.instance_id,
  instanceName: log.instance_name,
  carouselData: log.carousel_data,
  excludeAdmins: options.excludeAdmins,  // Nova opção
}));
```

---

### Correção 5: Aplicar excludeAdmins nos Broadcasters

**Arquivos:** `Broadcaster.tsx` e `LeadsBroadcaster.tsx`

Quando `resendData.excludeAdmins` estiver definido, pré-configurar o toggle correspondente no formulário de mensagem.

---

## Fluxo de Reenvio Atualizado

```text
┌─────────────────────────────────────────────────────────────┐
│  ANTES (Problemático)                                       │
├─────────────────────────────────────────────────────────────┤
│  Clique em "Reenviar"                                       │
│           ↓                                                 │
│  Redireciona para /broadcast ou /leads-broadcast            │
│           ↓                                                 │
│  Usuário precisa selecionar instância                       │
│           ↓                                                 │
│  Usuário precisa selecionar grupos/leads                    │
│           ↓                                                 │
│  Mensagem preenchida (sem carrossel no caso de leads)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  DEPOIS (Solução)                                           │
├─────────────────────────────────────────────────────────────┤
│  Clique em "Reenviar"                                       │
│           ↓                                                 │
│  ┌─────────────────────────────────────────────┐            │
│  │  Modal: "Opções de Reenvio"                 │            │
│  │                                             │            │
│  │  Destino:                                   │            │
│  │  ◉ Grupos    ○ Leads                        │            │
│  │                                             │            │
│  │  ☐ Excluir Admins/Owners                    │            │
│  │                                             │            │
│  │           [Cancelar] [Reenviar →]           │            │
│  └─────────────────────────────────────────────┘            │
│           ↓                                                 │
│  Redireciona com opções salvas                              │
│           ↓                                                 │
│  Usuário continua fluxo normal com toggle pré-configurado   │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/dashboard/LeadsBroadcaster.tsx` | Adicionar `carouselData` ao `initialData` |
| `src/components/broadcast/ResendOptionsDialog.tsx` | **NOVO** - Dialog com opções de reenvio |
| `src/components/broadcast/BroadcastHistory.tsx` | Integrar o dialog de opções |
| `src/pages/dashboard/BroadcastHistoryPage.tsx` | Atualizar handler com novas opções |
| `src/pages/dashboard/Broadcaster.tsx` | Aplicar `excludeAdmins` do resendData |

---

## Detalhes Técnicos

### Interface do ResendOptionsDialog

```typescript
interface ResendOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: BroadcastLog;
  onConfirm: (options: {
    destination: 'groups' | 'leads';
    excludeAdmins: boolean;
  }) => void;
}
```

### Dados do sessionStorage Atualizados

```typescript
interface ResendData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  instanceId: string;
  instanceName: string | null;
  carouselData?: CarouselData;
  excludeAdmins?: boolean;  // Nova propriedade
}
```

---

## Resultado Esperado

1. Clique em "Reenviar" abre modal com opções
2. Usuário escolhe destino (Grupos ou Leads) e configuração de admins
3. Redirecionamento automático para o broadcaster correto
4. Formulário de mensagem já vem preenchido (incluindo carrossel)
5. Toggle "Excluir Admins" já vem pré-configurado conforme escolha
