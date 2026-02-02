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
    <div className="p-3 bg-muted/30 rounded-lg border border-border/40 space-y-2">
      {/* Row 1: Type and Label */}
      <div className="flex items-center gap-2">
        <Select 
          value={button.type} 
          onValueChange={(v) => handleTypeChange(v as CarouselButton['type'])}
          disabled={disabled}
        >
          <SelectTrigger className="w-[110px] h-9 bg-background border-border/50">
            <div className="flex items-center gap-1.5">
              {getButtonIcon(button.type)}
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="URL">
              <div className="flex items-center gap-2">
                <Link className="w-3.5 h-3.5" />
                URL
              </div>
            </SelectItem>
            <SelectItem value="REPLY">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                Resposta
              </div>
            </SelectItem>
            <SelectItem value="CALL">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" />
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
          className="h-9 flex-1 min-w-0 bg-background border-border/50"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disabled}
          className="h-9 w-9 shrink-0 hover:bg-destructive/10"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      {/* Row 2: URL or Phone input (conditional) */}
      {button.type === 'URL' && (
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
          <Input
            placeholder="https://exemplo.com"
            value={button.url || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={disabled}
            className="h-9 flex-1 bg-background border-border/50"
            type="url"
          />
        </div>
      )}

      {button.type === 'CALL' && (
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
          <Input
            placeholder="+55 11 99999-9999"
            value={button.phone || ''}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={disabled}
            className="h-9 flex-1 bg-background border-border/50"
            type="tel"
          />
        </div>
      )}
    </div>
  );
}
