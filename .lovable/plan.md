
# Melhorar Player de Áudio com Controles de Velocidade no Helpdesk

## Objetivo
Criar um player de áudio customizado com controles de velocidade (1x, 1.5x, 2x) e melhor visual, similar ao WhatsApp, substituindo o HTML5 nativo `<audio controls>` que é muito pequeno/retraído.

## Problema Atual
- O elemento `<audio controls>` nativo é compacto e retraído
- Não oferece controles de velocidade de reprodução
- Visual não se integra bem com o design do Helpdesk
- Não permite customização de aparência

## Solução Proposta

### 1. Criar Novo Componente: `src/components/helpdesk/AudioPlayer.tsx`

Um player de áudio customizado com:
- Botão play/pause com ícone (Play/Pause do Lucide)
- Slider de progresso da música
- Exibição de tempo (tempo atual / duração total)
- Dropdown de velocidade (1x, 1.5x, 2x)
- Visual fluido e espaçoso
- Responsivo para mobile e desktop

**Estrutura do componente:**
```typescript
interface AudioPlayerProps {
  src: string;
  direction: 'incoming' | 'outgoing';
}

export const AudioPlayer = ({ src, direction }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Estados e funções para controlar:
  // - togglePlay()
  // - handleProgressChange(value)
  // - handleSpeedChange(rate)
  // - Formatação de tempo com date-fns
  
  // Renderizar:
  // [Play icon] [Slider de progresso] [Tempo] [Dropdown com 1x, 1.5x, 2x]
}
```

**Estilos:**
- Container com padding/espaçamento confortável
- Botão play com hover effect (cor clara no escuro, animação suave)
- Slider com cor diferenciada para o indicador de progresso
- Dropdown discreto no canto direito
- Separação clara entre incoming e outgoing (cores consistentes)

### 2. Atualizar `MessageBubble.tsx`

Remover o `<audio controls>` nativo e integrar o novo componente:

```typescript
// Antes:
{message.media_type === 'audio' && message.media_url && (
  <div className="mb-1">
    <audio controls className="max-w-[260px] w-full h-10">
      <source src={message.media_url} type="audio/mpeg" />
      <source src={message.media_url} type="audio/ogg" />
    </audio>
  </div>
)}

// Depois:
{message.media_type === 'audio' && message.media_url && (
  <AudioPlayer src={message.media_url} direction={message.direction} />
)}
```

### 3. Detalhes Técnicos

**Dependências e Imports:**
- `useRef`, `useState` do React
- Ícones do Lucide: `Play`, `Pause`, `ChevronDown`
- `cn()` do `@/lib/utils` para classes
- `format` do `date-fns` para formatação de tempo
- Componentes UI existentes: `Button`, `Slider` (ou input type="range")

**Gerenciamento de Estado:**
- `isPlaying`: boolean para controlar play/pause
- `currentTime`: número para posição atual
- `duration`: número para duração total
- `playbackRate`: 1 | 1.5 | 2 para velocidade

**Eventos do HTMLAudioElement:**
- `onLoadedMetadata`: capturar duração
- `onTimeUpdate`: atualizar tempo durante reprodução
- `onEnded`: resetar ao terminar

**Responsividade:**
- Mobile: player compacto mas legível
- Desktop: mais espaçoso, controls visíveis

### 4. Comportamento Esperado

```text
Player Incoming (mensagem recebida):
[▶] ════════════●═════════ [0:15 / 1:30] [▼ 1x]

Player Outgoing (mensagem enviada):
[▶] ════════════●═════════ [0:15 / 1:30] [▼ 1x]

Dropdown de velocidade aberto:
[▼ 1x]
├─ 1x (selecionado)
├─ 1.5x
└─ 2x
```

## Mudanças por Arquivo

### A. Criar `src/components/helpdesk/AudioPlayer.tsx`
- Novo arquivo com componente customizado
- ~150-200 linhas de código
- Gerencia estado de reprodução, progresso e velocidade

### B. Atualizar `src/components/helpdesk/MessageBubble.tsx`
- Importar `AudioPlayer`
- Substituir bloco `<audio controls>` pelo novo componente
- Manter estrutura de conditional rendering

## Resultado Final

- ✅ Player expandido e bem visual
- ✅ Controles de velocidade (1x, 1.5x, 2x)
- ✅ Melhor integração visual com o Helpdesk
- ✅ Responsivo em mobile e desktop
- ✅ Funcionalidade equivalente ao WhatsApp
- ✅ Suporta múltiplos formatos (MP3, OGG)
