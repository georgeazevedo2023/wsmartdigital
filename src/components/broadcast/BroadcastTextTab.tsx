import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { MAX_MESSAGE_LENGTH } from '@/hooks/useBroadcastForm';

interface BroadcastTextTabProps {
  message: string;
  onMessageChange: (msg: string) => void;
  disabled: boolean;
}

const BroadcastTextTab = ({ message, onMessageChange, disabled }: BroadcastTextTabProps) => {
  const characterCount = message.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Digite sua mensagem..."
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        disabled={disabled}
        className="min-h-[120px] resize-none"
        maxLength={MAX_MESSAGE_LENGTH + 100}
      />
      <div className="flex items-center justify-between">
        <EmojiPicker onEmojiSelect={(emoji) => onMessageChange(message + emoji)} disabled={disabled} />
        <span className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {characterCount.toLocaleString()}/{MAX_MESSAGE_LENGTH.toLocaleString()} caracteres
        </span>
      </div>
    </div>
  );
};

export default BroadcastTextTab;
