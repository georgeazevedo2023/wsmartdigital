
# Plano: Editor de Templates de Carrossel no Disparador

## Visão Geral
Criar um editor visual completo para templates de carrossel no Disparador, permitindo que usuários definam cards com imagens, textos e botões de ação, seguindo a estrutura da API UAZAPI.

---

## Estrutura do Carrossel (baseado na documentação)

```text
{
  "phone": "551199999999",
  "message": "Texto principal da mensagem",
  "carousel": [
    {
      "text": "Texto do card 1",
      "image": "https://url-da-imagem.com/1.jpg",
      "buttons": [
        { "id": "1", "label": "Ver mais", "type": "URL", "url": "https://..." },
        { "id": "2", "label": "Tenho interesse", "type": "REPLY" }
      ]
    },
    {
      "text": "Texto do card 2",
      "image": "https://url-da-imagem.com/2.jpg",
      "buttons": [
        { "id": "1", "label": "Ligar", "type": "CALL", "phone": "551199999999" }
      ]
    }
  ]
}
```

### Limites e Regras
| Item | Limite |
|------|--------|
| Cards por carrossel | Mínimo 2, máximo 10 |
| Botões por card | Máximo 3 |
| Tipos de botão | URL, REPLY, CALL |
| Imagem | Obrigatória por card |
| Texto do card | Obrigatório |

---

## Layout Visual do Editor

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  📋 Carrossel                                                    [Tabs ...]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Mensagem principal:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Digite a mensagem que acompanha o carrossel...                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  Cards do carrossel (2-10):                                     [+ Adicionar│
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Card 1                                                    [↑] [↓] [🗑]│ │
│  │ ┌─────────────────┬─────────────────────────────────────────────────┐ │ │
│  │ │  ┌───────────┐  │ Texto do card:                                  │ │ │
│  │ │  │           │  │ ┌────────────────────────────────────────────┐  │ │ │
│  │ │  │  [Upload] │  │ │ Descrição do produto ou serviço...        │  │ │ │
│  │ │  │   ou URL  │  │ └────────────────────────────────────────────┘  │ │ │
│  │ │  │           │  │                                                 │ │ │
│  │ │  └───────────┘  │ Botões:                           [+ Add Botão] │ │ │
│  │ │                 │ ┌─────────┬────────┬──────────────────────────┐ │ │ │
│  │ │                 │ │ [URL ▼] │ Label  │ https://exemplo.com      │ │ │ │
│  │ │                 │ └─────────┴────────┴──────────────────────────┘ │ │ │
│  │ │                 │ ┌─────────┬────────┬──────────────────────────┐ │ │ │
│  │ │                 │ │ [REPLY] │ Label  │                          │ │ │ │
│  │ │                 │ └─────────┴────────┴──────────────────────────┘ │ │ │
│  │ └─────────────────┴─────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Card 2                                                    [↑] [↓] [🗑]│ │
│  │ ...                                                                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 👁️ Preview do Carrossel                                               │ │
│  │                                                                       │ │
│  │  "Mensagem principal"                                                 │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐                                     │ │
│  │  │ Card 1 │ │ Card 2 │ │ Card 3 │  ← ●●● →                            │ │
│  │  │[imagem]│ │[imagem]│ │[imagem]│                                     │ │
│  │  │ texto  │ │ texto  │ │ texto  │                                     │ │
│  │  │[botão1]│ │[botão1]│ │[botão1]│                                     │ │
│  │  │[botão2]│ │[botão2]│ │[botão2]│                                     │ │
│  │  └────────┘ └────────┘ └────────┘                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes a Criar

### 1. CarouselEditor.tsx (Componente Principal)
```typescript
interface CarouselCard {
  id: string;          // ID único para React key
  text: string;        // Texto do card
  image: string;       // URL da imagem ou base64
  imageFile?: File;    // Arquivo local (se upload)
  buttons: CarouselButton[];
}

interface CarouselButton {
  id: string;
  type: 'URL' | 'REPLY' | 'CALL';
  label: string;
  url?: string;        // Para tipo URL
  phone?: string;      // Para tipo CALL
}

interface CarouselEditorProps {
  value: {
    message: string;
    cards: CarouselCard[];
  };
  onChange: (value: { message: string; cards: CarouselCard[] }) => void;
  disabled?: boolean;
}
```

### 2. CarouselCardEditor.tsx (Editor de Card Individual)
- Upload de imagem (arquivo local ou URL)
- Campo de texto do card
- Lista de botões editável
- Botões de reordenação (mover para cima/baixo)
- Botão de exclusão

### 3. CarouselButtonEditor.tsx (Editor de Botão)
- Select para tipo (URL, REPLY, CALL)
- Campo de label
- Campo condicional (URL ou telefone baseado no tipo)

### 4. CarouselPreview.tsx (Preview Visual)
- Exibe o carrossel como aparecerá no WhatsApp
- Navegação horizontal entre cards
- Visualização de botões

---

## Mudanças no Banco de Dados

Adicionar coluna para armazenar dados do carrossel em templates:

```sql
ALTER TABLE message_templates 
ADD COLUMN carousel_data jsonb DEFAULT NULL;
```

A estrutura `carousel_data` armazenará:
```json
{
  "message": "Texto principal",
  "cards": [
    {
      "text": "Texto card",
      "image": "url",
      "buttons": [...]
    }
  ]
}
```

---

## Mudanças nos Arquivos Existentes

### BroadcastMessageForm.tsx
- Adicionar nova aba "Carrossel" no TabsList
- Integrar `CarouselEditor` no conteúdo da aba
- Adicionar estado para dados do carrossel
- Implementar função `sendCarousel` para envio

### uazapi-proxy/index.ts (Edge Function)
- Adicionar case `send-carousel` para roteamento
- Mapear payload para o formato esperado pela API UAZAPI

### useMessageTemplates.ts
- Atualizar interface para incluir `carousel_data`
- Atualizar funções de CRUD para o novo campo

### TemplateSelector.tsx
- Adicionar ícone específico para templates de carrossel
- Atualizar callback `onSelect` para incluir dados do carrossel

---

## Fluxo de Envio do Carrossel

```text
1. Usuário monta o carrossel no editor
2. Clica em "Enviar"
3. Para cada grupo selecionado:
   a. Converter imagens locais para base64 (se necessário)
   b. Montar payload no formato UAZAPI
   c. Chamar edge function com action: 'send-carousel'
4. Edge function roteia para /send/carousel da UAZAPI
5. Log de broadcast salvo com message_type: 'carousel'
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/broadcast/CarouselEditor.tsx` | Criar | Editor principal do carrossel |
| `src/components/broadcast/CarouselCardEditor.tsx` | Criar | Editor de card individual |
| `src/components/broadcast/CarouselButtonEditor.tsx` | Criar | Editor de botão |
| `src/components/broadcast/CarouselPreview.tsx` | Criar | Preview visual do carrossel |
| `src/components/broadcast/BroadcastMessageForm.tsx` | Modificar | Adicionar aba de carrossel |
| `supabase/functions/uazapi-proxy/index.ts` | Modificar | Adicionar rota send-carousel |
| `src/hooks/useMessageTemplates.ts` | Modificar | Suporte a carousel_data |
| **Banco de Dados** | Migração | Adicionar coluna carousel_data |

---

## Validações

### Client-side
- Mínimo 2 cards, máximo 10
- Cada card deve ter imagem e texto
- Máximo 3 botões por card
- Botão URL requer URL válida
- Botão CALL requer telefone válido
- Label do botão obrigatório

### Server-side (Edge Function)
- Validar estrutura do payload
- Verificar tamanho das imagens (base64)
- Sanitizar URLs

---

## Funcionalidades do Editor

- Adicionar/remover cards
- Reordenar cards (drag & drop ou botões)
- Upload de imagem por arquivo ou URL
- Preview em tempo real
- Validação visual (erros destacados)
- Salvar como template
- Carregar template existente

---

## Benefícios

- **Visual**: Editor WYSIWYG intuitivo para montar carrosséis
- **Flexibilidade**: Suporte a todos os tipos de botões (URL, REPLY, CALL)
- **Produtividade**: Salvar carrosséis como templates reutilizáveis
- **Validação**: Feedback em tempo real sobre erros
- **Preview**: Ver exatamente como ficará antes de enviar
