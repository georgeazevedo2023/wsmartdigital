

# Plano: Aprimorar Histórico de Envios no Disparador

## Objetivo
Adicionar ao histórico de envios:
1. **Nomes dos grupos** que receberam a mensagem
2. **Total de participantes / entregues** de forma mais clara
3. **Preview visual da mensagem** (incluindo mídia)
4. **Botão de reenviar** para repetir o disparo

---

## Mudanças no Banco de Dados

Será necessário adicionar uma nova coluna para armazenar os nomes dos grupos:

```sql
ALTER TABLE broadcast_logs 
ADD COLUMN group_names text[] DEFAULT '{}';
```

Isso permitirá armazenar um array com os nomes de todos os grupos que receberam o envio.

---

## Arquitetura da Solução

### Layout Visual do Item de Histórico (Expandido)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐  [✓ Concluído] [Imagem]  [Delay 5-10s]                 120/125     │
│ │ 📷  │  Minha Instância • 3 grupo(s)                          96% entregue│
│ └─────┘                                                              [▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📋 Grupos:                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Grupo A] [Grupo B] [Grupo C]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  👁️ Preview da mensagem:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │            ┌──────────────────────────────────────┐                 │   │
│  │            │ ┌──────────────────────────────────┐ │                 │   │
│  │            │ │      [Imagem preview aqui]       │ │                 │   │
│  │            │ └──────────────────────────────────┘ │                 │   │
│  │            │ Texto da legenda ou mensagem...    │ │                 │   │
│  │            │                          ✓✓ 14:30  │ │                 │   │
│  │            └──────────────────────────────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  📊 Detalhes:                                                               │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐                  │
│  │ 🕐 há 2h    │ ⏱ 1min 30s  │ 👥 Excl.    │ ✓ 120 ok    │                  │
│  │             │             │    admins   │ ✗ 5 falha   │                  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘                  │
│                                                                             │
│  📅 15/01/2024 às 14:30                                                     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    [🔄 Reenviar esta mensagem]                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementação Detalhada

### 1. Migração do Banco de Dados

Adicionar coluna para armazenar nomes dos grupos:

```sql
ALTER TABLE broadcast_logs 
ADD COLUMN group_names text[] DEFAULT '{}';
```

### 2. Atualizar BroadcastMessageForm.tsx

Modificar a função `saveBroadcastLog` para incluir os nomes dos grupos:

```typescript
const saveBroadcastLog = async (params: {
  // ... parâmetros existentes
  groupNames: string[];  // NOVO
}) => {
  await supabase.from('broadcast_logs').insert({
    // ... campos existentes
    group_names: params.groupNames,  // NOVO
  });
};
```

Passar os nomes dos grupos ao chamar a função:

```typescript
await saveBroadcastLog({
  // ... outros parâmetros
  groupNames: selectedGroups.map(g => g.name),
});
```

### 3. Atualizar BroadcastHistory.tsx

#### 3.1 Atualizar Interface

```typescript
interface BroadcastLog {
  // ... campos existentes
  group_names: string[] | null;  // NOVO
}
```

#### 3.2 Criar Componente de Preview Somente Leitura

Reutilizar a lógica do `MessagePreview` mas sem edição:

```typescript
const HistoryMessagePreview = ({ 
  type, 
  content, 
  mediaUrl 
}: { 
  type: string; 
  content: string | null; 
  mediaUrl: string | null;
}) => {
  const messageType = type === 'text' ? 'text' : 
                     type === 'image' ? 'image' : 
                     type === 'video' ? 'video' : 
                     type === 'audio' || type === 'ptt' ? 'audio' : 'file';
  
  return (
    <div className="bg-muted/30 rounded-lg p-3 flex justify-end">
      <div className="max-w-[85%] bg-primary/10 rounded-lg rounded-tr-none p-3 border border-border/30">
        {/* Renderizar mídia baseado no tipo */}
        {messageType === 'image' && mediaUrl && (
          <img src={mediaUrl} alt="Preview" className="rounded-md max-h-32 w-auto mb-2" />
        )}
        {/* ... outros tipos de mídia */}
        
        {/* Texto com formatação WhatsApp */}
        {content && <p className="text-sm whitespace-pre-wrap">{formatWhatsAppText(content)}</p>}
        
        {/* Timestamp */}
        <div className="flex justify-end items-center gap-1 mt-1">
          <span className="text-[10px] text-muted-foreground">✓✓</span>
        </div>
      </div>
    </div>
  );
};
```

#### 3.3 Adicionar Seção de Grupos

```tsx
{/* Nomes dos grupos */}
{log.group_names && log.group_names.length > 0 && (
  <div className="mt-3">
    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
      <Users className="w-3 h-3" />
      Grupos ({log.group_names.length}):
    </p>
    <div className="flex flex-wrap gap-1.5">
      {log.group_names.map((name, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs">
          {name}
        </Badge>
      ))}
    </div>
  </div>
)}
```

#### 3.4 Adicionar Botão de Reenviar

```tsx
<Button
  variant="outline"
  size="sm"
  className="mt-3 w-full"
  onClick={() => onResend?.(log)}
>
  <RefreshCw className="w-4 h-4 mr-2" />
  Reenviar esta mensagem
</Button>
```

#### 3.5 Props para Callback de Reenvio

```typescript
interface BroadcastHistoryProps {
  onResend?: (log: BroadcastLog) => void;
}
```

### 4. Integrar Reenvio no Broadcaster.tsx

Passar o callback e preencher o formulário com os dados do log:

```typescript
const handleResend = (log: BroadcastLog) => {
  // Encontrar a instância pelo ID
  // Preencher a mensagem/mídia
  // Navegar para o passo de grupos ou mostrar diálogo
  toast.info('Selecione os grupos para reenviar');
};
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| **Banco de Dados** | Adicionar coluna `group_names text[]` |
| `src/components/broadcast/BroadcastMessageForm.tsx` | Passar nomes dos grupos ao salvar log |
| `src/components/broadcast/BroadcastHistory.tsx` | Mostrar grupos, preview de mensagem e botão reenviar |
| `src/pages/dashboard/Broadcaster.tsx` | Implementar callback de reenvio |

---

## Benefícios

- **Transparência**: Usuário vê exatamente para quais grupos enviou
- **Rastreabilidade**: Preview visual permite conferir a mensagem enviada
- **Produtividade**: Botão de reenvio acelera envios repetidos
- **Clareza**: Estatísticas de entrega mais visíveis e detalhadas

---

## Detalhes Técnicos

### Formatação WhatsApp no Histórico

Reutilizar o parser recursivo do `MessagePreview`:

```typescript
// Função existente que suporta *negrito*, _itálico_, ~tachado~
const formatWhatsAppText = (text: string): React.ReactNode => {
  // ... lógica de parsing recursivo
};
```

### Preview de Mídia

O histórico já armazena `media_url`, então podemos exibir:
- **Imagem**: `<img src={mediaUrl} />`
- **Vídeo**: Thumbnail com ícone de play
- **Áudio**: Barra de áudio simulada com ícone de microfone
- **Documento**: Ícone de arquivo

### Fluxo de Reenvio

1. Usuário clica em "Reenviar"
2. Sistema carrega os dados do log (mensagem, mídia, tipo)
3. Navega para a seleção de grupos (mantendo a mensagem preenchida)
4. Usuário seleciona novos grupos e confirma

