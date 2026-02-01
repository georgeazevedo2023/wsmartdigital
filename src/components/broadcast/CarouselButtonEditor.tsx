import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Link, MessageSquare, Phone } from 'lucide-react';

export interface CarouselButton {
  id: string;
  type: 'URL' | 'REPLY' | 'CALL';
  label: string;
  url?: string;
  phone?: string;
}

interface CarouselButtonEditorProps {
  button: CarouselButton;
  onChange: (button: CarouselButton) => void;
  onDelete: () => void;
  disabled?: boolean;
}

const getButtonIcon = (type: CarouselButton['type']) => {
  switch (type) {
    case 'URL':
      return <Link className="w-3 h-3" />;
    case 'REPLY':
      return <MessageSquare className="w-3 h-3" />;
    case 'CALL':
      return <Phone className="w-3 h-3" />;
  }
};

export function CarouselButtonEditor({ 
  button, 
  onChange, 
  onDelete,
  disabled 
}: CarouselButtonEditorProps) {
  const handleTypeChange = (type: CarouselButton['type']) => {
    onChange({
      ...button,
      type,
      url: type === 'URL' ? button.url || '' : undefined,
      phone: type === 'CALL' ? button.phone || '' : undefined,
    });
  };

  const handleLabelChange = (label: string) => {
    onChange({ ...button, label });
  };

  const handleUrlChange = (url: string) => {
    onChange({ ...button, url });
  };

  const handlePhoneChange = (phone: string) => {
    onChange({ ...button, phone });
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-background/50 rounded border border-border/30">
      <Select 
        value={button.type} 
        onValueChange={(v) => handleTypeChange(v as CarouselButton['type'])}
        disabled={disabled}
      >
        <SelectTrigger className="w-24 h-8">
          <div className="flex items-center gap-1">
            {getButtonIcon(button.type)}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="URL">
            <div className="flex items-center gap-2">
              <Link className="w-3 h-3" />
              URL
            </div>
          </SelectItem>
          <SelectItem value="REPLY">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Resposta
            </div>
          </SelectItem>
          <SelectItem value="CALL">
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3" />
              Ligar
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="Texto do botão"
        value={button.label}
        onChange={(e) => handleLabelChange(e.target.value)}
        disabled={disabled}
        className="h-8 flex-1 min-w-0"
      />

      {button.type === 'URL' && (
        <Input
          placeholder="https://..."
          value={button.url || ''}
          onChange={(e) => handleUrlChange(e.target.value)}
          disabled={disabled}
          className="h-8 flex-1 min-w-0"
          type="url"
        />
      )}

      {button.type === 'CALL' && (
        <Input
          placeholder="5511999999999"
          value={button.phone || ''}
          onChange={(e) => handlePhoneChange(e.target.value)}
          disabled={disabled}
          className="h-8 w-36"
          type="tel"
        />
      )}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={disabled}
        className="h-8 w-8 shrink-0"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}
