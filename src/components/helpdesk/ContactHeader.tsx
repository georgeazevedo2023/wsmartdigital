import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, ArrowLeft } from 'lucide-react';

interface ContactHeaderProps {
  name: string;
  phone?: string;
  profilePicUrl?: string | null;
  onBack?: () => void;
}

export const ContactHeader = ({ name, phone, profilePicUrl, onBack }: ContactHeaderProps) => (
  <>
    {onBack && (
      <Button variant="ghost" size="sm" className="gap-1 -ml-2 -mt-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>
    )}
    <div className="flex flex-col items-center text-center">
      <Avatar className="w-16 h-16 mb-2">
        <AvatarImage src={profilePicUrl || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xl">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h3 className="font-semibold">{name}</h3>
      {phone && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Phone className="w-3 h-3" />
          <span>{phone}</span>
        </div>
      )}
    </div>
  </>
);
