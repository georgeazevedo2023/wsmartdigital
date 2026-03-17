import { Button } from '@/components/ui/button';
import { Send, X } from 'lucide-react';

interface AudioRecorderBarProps {
  recordingTime: number;
  sending: boolean;
  formatTime: (s: number) => string;
  onCancel: () => void;
  onSend: () => void;
}

const AudioRecorderBar = ({ recordingTime, sending, formatTime, onCancel, onSend }: AudioRecorderBarProps) => (
  <div className="flex items-center gap-3">
    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-destructive" onClick={onCancel} title="Cancelar gravação">
      <X className="w-4 h-4" />
    </Button>

    <div className="flex items-center gap-2 flex-1">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
      </span>
      <span className="text-sm font-mono text-destructive">{formatTime(recordingTime)}</span>
      <span className="text-xs text-muted-foreground">Gravando...</span>
    </div>

    <Button size="icon" className="shrink-0 h-9 w-9" onClick={onSend} disabled={sending}>
      <Send className="w-4 h-4" />
    </Button>
  </div>
);

export default AudioRecorderBar;
