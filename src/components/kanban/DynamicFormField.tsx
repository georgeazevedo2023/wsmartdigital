import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface KanbanField {
  id: string;
  name: string;
  field_type: 'text' | 'currency' | 'date' | 'select';
  options: string[] | null;
  is_primary: boolean;
  required: boolean;
  show_on_card: boolean;
}

interface DynamicFormFieldProps {
  field: KanbanField;
  value: string;
  onChange: (value: string) => void;
}

export function DynamicFormField({ field, value, onChange }: DynamicFormFieldProps) {
  const labelEl = (
    <Label className="text-xs font-medium text-muted-foreground">
      {field.name}
      {field.required && <span className="text-destructive ml-1">*</span>}
      {field.is_primary && (
        <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">principal</span>
      )}
    </Label>
  );

  if (field.field_type === 'text') {
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.name}
          className="h-9"
        />
      </div>
    );
  }

  if (field.field_type === 'currency') {
    const handleCurrency = (raw: string) => {
      // Remove non-digits
      const digits = raw.replace(/\D/g, '');
      if (!digits) { onChange(''); return; }
      const num = parseInt(digits, 10) / 100;
      onChange(
        num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      );
    };
    return (
      <div className="space-y-1.5">
        {labelEl}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
          <Input
            value={value.replace(/^R\$\s?/, '')}
            onChange={e => handleCurrency(e.target.value)}
            placeholder="0,00"
            className="h-9 pl-9"
          />
        </div>
      </div>
    );
  }

  if (field.field_type === 'date') {
    const parsedDate = value ? new Date(value) : undefined;
    const isValidDate = parsedDate instanceof Date && !isNaN(parsedDate.getTime());

    return (
      <div className="space-y-1.5">
        {labelEl}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full h-9 justify-start text-left font-normal',
                !value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
              {isValidDate ? format(parsedDate!, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={isValidDate ? parsedDate : undefined}
              onSelect={d => onChange(d ? d.toISOString() : '')}
              initialFocus
              locale={ptBR}
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  if (field.field_type === 'select') {
    const opts = field.options || [];
    return (
      <div className="space-y-1.5">
        {labelEl}
        <Select value={value || 'none'} onValueChange={v => onChange(v === 'none' ? '' : v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Nenhum —</SelectItem>
            {opts.map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return null;
}
