
# Plano: Melhorar Histórico de Envios com Datas e Preview de Carrossel

## Objetivo
1. Exibir data e hora de **início** e **fim** do envio de forma clara
2. Adicionar suporte para **preview de carrossel** no histórico
3. Adicionar tipo "Carrossel" no filtro de tipos de mensagem

---

## Situação Atual

### Dados na Tabela `broadcast_logs`
A tabela já possui:
- `started_at` - timestamp do início
- `completed_at` - timestamp do término
- `created_at` - timestamp de criação

**Problema**: Não existe coluna para armazenar dados do carrossel (`carousel_data`)

### Interface Atual
- Mostra apenas "há X minutos" no histórico expandido
- Não exibe horários específicos de início e fim
- Não suporta preview de carrossel (só texto, imagem, vídeo, áudio, documento)

---

## Mudanças Necessárias

### 1. Adicionar Coluna `carousel_data` na Tabela

Criar migration para adicionar:
```sql
ALTER TABLE broadcast_logs 
ADD COLUMN carousel_data jsonb;
```

### 2. Modificar BroadcastHistory.tsx

#### 2.1 Atualizar Interface `BroadcastLog`
```typescript
interface BroadcastLog {
  // ... campos existentes
  carousel_data: CarouselData | null; // Novo campo
}
```

#### 2.2 Adicionar "Carrossel" ao Filtro de Tipos
```typescript
type MessageTypeFilter = 'all' | 'text' | 'image' | 'video' | 'audio' | 'document' | 'carousel';
```

#### 2.3 Exibir Datas de Início e Fim
Substituir a exibição genérica por:

```
┌─────────────────────────────────────────┐
│ 📅 Início: 01/02/2026 às 21:00          │
│ 📅 Fim: 01/02/2026 às 21:05             │
│ ⏱️ Duração: 5min                        │
└─────────────────────────────────────────┘
```

#### 2.4 Criar Preview de Carrossel para Histórico

Criar componente `HistoryCarouselPreview` simplificado:
- Exibe cards em miniatura
- Navegação entre cards (setas)
- Mostra imagens e texto de cada card
- Exibe botões de ação configurados

### 3. Modificar BroadcastMessageForm.tsx

Ao salvar o log de broadcast de carrossel, incluir `carousel_data` no payload.

---

## Detalhes Técnicos

### Atualização do HistoryMessagePreview

Adicionar suporte para tipo `carousel`:

```typescript
const HistoryMessagePreview = ({ 
  type, 
  content, 
  mediaUrl,
  carouselData // Novo prop
}: { 
  type: string; 
  content: string | null; 
  mediaUrl: string | null;
  carouselData?: CarouselData | null;
}) => {
  const isCarousel = type === 'carousel';
  
  if (isCarousel && carouselData) {
    return <HistoryCarouselPreview data={carouselData} />;
  }
  
  // ... resto do código existente
};
```

### Novo Componente: HistoryCarouselPreview

```typescript
const HistoryCarouselPreview = ({ data }: { data: CarouselData }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        <Eye className="w-4 h-4 text-muted-foreground mt-0.5" />
        <span className="text-xs text-muted-foreground">Preview do carrossel</span>
      </div>
      
      {/* Mensagem principal */}
      {data.message && (
        <div className="bg-primary/10 rounded-lg p-3 mb-3">
          <p className="text-sm">{formatWhatsAppText(data.message)}</p>
        </div>
      )}
      
      {/* Cards com navegação */}
      <div className="flex items-center gap-2">
        <Button onClick={handlePrev}><ChevronLeft /></Button>
        <div className="flex-1">
          {/* Card ativo */}
          <CardPreview card={data.cards[activeIndex]} />
        </div>
        <Button onClick={handleNext}><ChevronRight /></Button>
      </div>
      
      {/* Indicador de página */}
      <div className="flex justify-center gap-1 mt-2">
        {data.cards.map((_, i) => (
          <span className={i === activeIndex ? 'bg-primary' : 'bg-muted'} />
        ))}
      </div>
    </div>
  );
};
```

### Exibição de Datas no Stats Grid

De:
```typescript
<div className="flex items-center gap-2 text-muted-foreground">
  <Clock className="w-4 h-4" />
  <span>
    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
  </span>
</div>
```

Para:
```typescript
<div className="grid grid-cols-1 gap-2">
  <div className="flex items-center gap-2 text-muted-foreground">
    <Play className="w-4 h-4" />
    <span>
      Início: {format(new Date(log.started_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
    </span>
  </div>
  {log.completed_at && (
    <div className="flex items-center gap-2 text-muted-foreground">
      <CheckCircle2 className="w-4 h-4" />
      <span>
        Fim: {format(new Date(log.completed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
      </span>
    </div>
  )}
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar coluna `carousel_data` |
| `src/components/broadcast/BroadcastHistory.tsx` | Datas, preview carrossel, filtro |
| `src/components/broadcast/BroadcastMessageForm.tsx` | Salvar `carousel_data` no log |

---

## Resultado Visual Esperado

### Header do Log (Fechado)
```
┌───────────────────────────────────────────────────────────────┐
│ 🔵 ✅ Concluído  [Carrossel]  [5-10s]                    2/2  │
│    teste_agri_loj03 • 1 grupo(s)                   100% ✓    │
└───────────────────────────────────────────────────────────────┘
```

### Log Expandido
```
┌───────────────────────────────────────────────────────────────┐
│ Grupos (1): [Grupo Teste]                                     │
├───────────────────────────────────────────────────────────────┤
│ 👁️ Preview do carrossel                                      │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ "Mensagem principal do carrossel"                       │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│   ◀  ┌─────────────────────────┐  ▶                          │
│      │   [Imagem do Card]      │                              │
│      │   Texto do card 1       │                              │
│      │   [Botão: Saiba mais]   │                              │
│      └─────────────────────────┘                              │
│              ● ○ ○ (indicador)                                │
├───────────────────────────────────────────────────────────────┤
│ ▶️ Início: 01/02/2026 às 21:00:15                             │
│ ✓ Fim: 01/02/2026 às 21:05:32                                │
│ ⏱️ Duração: 5min 17s                                          │
│ 👥 Excluindo admins   ✅ 2 sucesso • ❌ 0 falha               │
├───────────────────────────────────────────────────────────────┤
│ 🔄 Reenviar esta mensagem                                     │
└───────────────────────────────────────────────────────────────┘
```

---

## Benefícios

- **Transparência**: Datas exatas de início e fim do envio
- **Completude**: Preview de todos os tipos de mensagem incluindo carrossel
- **Consistência**: Filtro incluindo opção de carrossel
- **Auditoria**: Dados completos para análise de performance de envios
