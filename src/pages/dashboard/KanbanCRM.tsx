import { Kanban, Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KanbanCRM = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[70vh] gap-6 p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Kanban className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Kanban CRM</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus processos de vendas e atendimento com quadros kanban personalizáveis.
            Crie pipelines para qualquer fluxo de trabalho.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-foreground">Quadros Personalizados</span>
            <span className="text-xs text-muted-foreground text-center">Colunas, campos e regras de visibilidade</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card">
            <Kanban className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium text-foreground">Integração WhatsApp</span>
            <span className="text-xs text-muted-foreground text-center">Automações por etapa do funil</span>
          </div>
        </div>

        <Button size="lg" className="mt-2 gap-2" disabled>
          <Plus className="w-4 h-4" />
          Criar Primeiro Quadro
          <span className="text-xs opacity-70 ml-1">(Em breve — Etapa 2)</span>
        </Button>
      </div>
    </div>
  );
};

export default KanbanCRM;
