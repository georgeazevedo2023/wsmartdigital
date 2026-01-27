

# Plano: Adicionar Preview da Mensagem no Disparador

## Objetivo
Criar uma seção de **pré-visualização** que mostra exatamente como a mensagem ficará antes de enviar, simulando a aparência de uma mensagem do WhatsApp. Isso permitirá ao usuário revisar o conteúdo (texto ou mídia com legenda) antes de confirmar o envio.

---

## Localização do Preview

O preview ficará **abaixo da área de composição** e **acima dos toggles** (Excluir Admins, Delay, etc.), aparecendo apenas quando houver conteúdo válido para enviar.

```
┌──────────────────────────────────────────────────┐
│ 📝 Compor Mensagem                               │
├──────────────────────────────────────────────────┤
│ [Texto] [Mídia]                                  │
│                                                  │
│ ┌──────────────────────────────────────────┐     │
│ │ Textarea / Seleção de Mídia              │     │
│ └──────────────────────────────────────────┘     │
│                                                  │
│ ┌──────────────────────────────────────────┐     │
│ │ 👁️ PREVIEW                              │     │
│ │ ┌──────────────────────────────────────┐ │     │
│ │ │ (Balão estilo WhatsApp)              │ │     │
│ │ │                                      │ │     │
│ │ │ [Imagem preview aqui]                │ │     │
│ │ │                                      │ │     │
│ │ │ Texto da legenda ou mensagem aqui... │ │     │
│ │ └──────────────────────────────────────┘ │     │
│ └──────────────────────────────────────────┘     │
│                                                  │
│ [Toggle Excluir Admins]                          │
│ [Toggle Delay]                                   │
│ [Botões de ação]                                 │
└──────────────────────────────────────────────────┘
```

---

## Componente: MessagePreview

Criar um novo componente `src/components/broadcast/MessagePreview.tsx` que simula a aparência de uma mensagem do WhatsApp.

### Interface do Componente

```typescript
interface MessagePreviewProps {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  mediaUrl?: string;        // URL ou base64 para preview
  previewUrl?: string;      // Object URL do arquivo selecionado
  filename?: string;        // Para arquivos
  isPtt?: boolean;          // Para áudio como mensagem de voz
}
```

### Estrutura Visual

O preview usará um estilo similar ao WhatsApp:

```
┌─────────────────────────────────────────────────────────┐
│ 👁️ Preview da mensagem                                 │
│                                                         │
│       ┌────────────────────────────────────────┐        │
│       │ ┌──────────────────────────────────┐   │        │
│       │ │                                  │   │        │
│       │ │     [Imagem/Vídeo preview]       │   │        │
│       │ │                                  │   │        │
│       │ └──────────────────────────────────┘   │        │
│       │                                        │        │
│       │ Sua mensagem de texto aparece aqui     │        │
│       │ com formatação e quebras de linha...   │        │
│       │                                        │        │
│       │                              ✓✓ 12:00  │        │
│       └────────────────────────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementação

### 1. Criar `MessagePreview.tsx`

```typescript
import { Card } from '@/components/ui/card';
import { Eye, FileIcon, Mic, PlayCircle } from 'lucide-react';

interface MessagePreviewProps {
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  text?: string;
  mediaUrl?: string;
  previewUrl?: string;
  filename?: string;
  isPtt?: boolean;
}

const MessagePreview = ({ type, text, mediaUrl, previewUrl, filename, isPtt }: MessagePreviewProps) => {
  const hasContent = text?.trim() || mediaUrl?.trim() || previewUrl;
  
  if (!hasContent) return null;
  
  const imageSource = previewUrl || mediaUrl;
  const currentTime = new Date().toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span>Preview da mensagem</span>
      </div>
      
      <div className="bg-muted/30 rounded-lg p-4 flex justify-end">
        {/* Balão de mensagem estilo WhatsApp (remetente) */}
        <div className="max-w-[85%] bg-primary/10 rounded-lg rounded-tr-none p-3 shadow-sm border border-border/30">
          {/* Media preview */}
          {type === 'image' && imageSource && (
            <img 
              src={imageSource} 
              alt="Preview" 
              className="rounded-md max-h-48 w-auto mb-2"
            />
          )}
          
          {type === 'video' && (previewUrl || mediaUrl) && (
            <div className="relative mb-2">
              {previewUrl ? (
                <video 
                  src={previewUrl} 
                  className="rounded-md max-h-48 w-auto"
                />
              ) : (
                <div className="bg-black/10 rounded-md h-32 w-48 flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-muted-foreground/50" />
                </div>
              )}
            </div>
          )}
          
          {type === 'audio' && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-full px-4 py-2 mb-2">
              <Mic className="w-5 h-5 text-primary" />
              <div className="flex-1 h-1 bg-muted-foreground/30 rounded-full">
                <div className="h-full w-1/3 bg-primary rounded-full" />
              </div>
              <span className="text-xs text-muted-foreground">
                {isPtt ? '0:00' : filename || 'audio'}
              </span>
            </div>
          )}
          
          {type === 'file' && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-md px-4 py-3 mb-2">
              <FileIcon className="w-8 h-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {filename || 'documento'}
                </p>
              </div>
            </div>
          )}
          
          {/* Texto ou legenda */}
          {text && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {text}
            </p>
          )}
          
          {/* Timestamp */}
          <div className="flex justify-end items-center gap-1 mt-1">
            <span className="text-[10px] text-muted-foreground">
              {currentTime}
            </span>
            <span className="text-[10px] text-primary">✓✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePreview;
```

### 2. Integrar no `BroadcastMessageForm.tsx`

Adicionar o import e renderizar o componente:

```typescript
import MessagePreview from './MessagePreview';

// Dentro do JSX, após o TabsContent mas antes dos toggles:
{/* Message Preview */}
<MessagePreview 
  type={activeTab === 'text' ? 'text' : mediaType}
  text={activeTab === 'text' ? message : caption}
  mediaUrl={mediaUrl}
  previewUrl={previewUrl}
  filename={filename}
  isPtt={isPtt}
/>
```

---

## Comportamento

| Situação | O que o Preview mostra |
|----------|------------------------|
| Aba Texto, vazia | Não aparece |
| Aba Texto, com texto | Balão com texto |
| Aba Mídia, imagem selecionada | Imagem + legenda (se houver) |
| Aba Mídia, vídeo selecionado | Thumbnail do vídeo + legenda |
| Aba Mídia, áudio | Visualização de áudio com barra + legenda |
| Aba Mídia, documento | Ícone de arquivo + nome + legenda |
| Aba Mídia, apenas URL | Preview da mídia via URL |

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/broadcast/MessagePreview.tsx` | **Criar** - Novo componente |
| `src/components/broadcast/BroadcastMessageForm.tsx` | **Modificar** - Importar e usar o componente |

---

## Benefícios

- **Revisão visual**: Usuário vê exatamente como a mensagem ficará
- **Prevenção de erros**: Reduz chances de enviar mensagem incorreta
- **Experiência familiar**: Estilo similar ao WhatsApp facilita a compreensão
- **Feedback em tempo real**: Preview atualiza conforme o usuário digita

