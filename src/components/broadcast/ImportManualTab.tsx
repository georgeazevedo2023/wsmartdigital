import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface ImportManualTabProps {
  manualPhone: string;
  setManualPhone: (v: string) => void;
  manualName: string;
  setManualName: (v: string) => void;
  onAdd: () => void;
}

const ImportManualTab = ({ manualPhone, setManualPhone, manualName, setManualName, onAdd }: ImportManualTabProps) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="phone">Número *</Label>
        <Input id="phone" placeholder="11999998888" value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="name">Nome (opcional)</Label>
        <Input id="name" placeholder="João Silva" value={manualName} onChange={(e) => setManualName(e.target.value)} />
      </div>
    </div>
    <Button onClick={onAdd} disabled={!manualPhone.trim()}>
      <Plus className="w-4 h-4 mr-2" /> Adicionar Contato
    </Button>
  </div>
);

export default ImportManualTab;
