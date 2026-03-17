import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import type { UserProfile } from '@/hooks/useInstances';

interface CreateInstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreating: boolean;
  instanceName: string;
  onInstanceNameChange: (name: string) => void;
  selectedUserId: string;
  onUserIdChange: (id: string) => void;
  users: UserProfile[];
  onCreate: () => void;
}

export const CreateInstanceDialog = ({
  open, onOpenChange, isCreating, instanceName, onInstanceNameChange,
  selectedUserId, onUserIdChange, users, onCreate,
}: CreateInstanceDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Nova Instância
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Criar Nova Instância</DialogTitle>
        <DialogDescription>
          Crie uma nova instância do WhatsApp e atribua a um usuário
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="instance-name">Nome da Instância</Label>
          <Input
            id="instance-name"
            placeholder="Ex: Suporte - João"
            value={instanceName}
            onChange={(e) => onInstanceNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-select">Atribuir ao Usuário</Label>
          <Select value={selectedUserId} onValueChange={onUserIdChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um usuário" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button onClick={onCreate} disabled={isCreating}>
          {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>) : 'Criar Instância'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
