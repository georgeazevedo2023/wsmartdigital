

# Plano: Editar e Compartilhar Bases de Leads

## Objetivo
1. Permitir editar o nome e descricao de bases de leads existentes
2. Compartilhar bases de leads com todas as instancias do usuario para disparo

## Arquitetura Atual

A tabela `lead_databases` ja possui campos `name` e `description`, e esta vinculada ao `user_id`. As instancias sao acessadas via tabela `user_instance_access` que vincula usuarios a instancias.

Como cada usuario ja tem acesso a multiplas instancias (via `user_instance_access`), as bases de leads ja sao "compartilhadas" implicitamente - o usuario pode selecionar qualquer instancia que tem acesso para disparar. O fluxo atual permite isso:
1. Selecionar instancia
2. Selecionar base de leads (qualquer base do usuario)
3. Disparar

Portanto, o "compartilhamento" ja funciona - o que precisamos e apenas adicionar a UI para editar nome/descricao.

---

## Mudancas Necessarias

### 1. Novo Componente: EditDatabaseDialog.tsx

Criar dialog para editar nome e descricao de uma base existente:

```typescript
// src/components/broadcast/EditDatabaseDialog.tsx
interface EditDatabaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database: LeadDatabase | null;
  onSave: (updated: LeadDatabase) => void;
}

const EditDatabaseDialog = ({ open, onOpenChange, database, onSave }) => {
  const [name, setName] = useState(database?.name || '');
  const [description, setDescription] = useState(database?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (database) {
      setName(database.name);
      setDescription(database.description || '');
    }
  }, [database]);

  const handleSave = async () => {
    if (!database || !name.trim()) return;
    
    setIsSaving(true);
    const { data, error } = await supabase
      .from('lead_databases')
      .update({ name: name.trim(), description: description.trim() || null })
      .eq('id', database.id)
      .select()
      .single();
    
    if (!error && data) {
      onSave(data);
      toast.success('Base atualizada');
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Base de Leads</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Descricao (opcional)</Label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descricao para esta base..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? <Loader2 className="animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

### 2. Atualizar LeadDatabaseSelector.tsx

Adicionar botao de edicao ao lado do botao de delete:

```typescript
// Adicionar estado
const [editTarget, setEditTarget] = useState<LeadDatabase | null>(null);

// Adicionar botao de edicao na UI
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-muted-foreground hover:text-primary"
  onClick={(e) => {
    e.stopPropagation();
    setEditTarget(db);
  }}
>
  <Pencil className="w-4 h-4" />
</Button>

// Adicionar handler de atualizacao
const handleDatabaseUpdated = (updated: LeadDatabase) => {
  setDatabases(prev => prev.map(d => d.id === updated.id ? updated : d));
};

// Renderizar dialog
<EditDatabaseDialog
  open={!!editTarget}
  onOpenChange={(open) => !open && setEditTarget(null)}
  database={editTarget}
  onSave={handleDatabaseUpdated}
/>
```

### 3. UI Final do Card da Base

```text
+----------------------------------------------+
| [DB Icon] Clientes VIP           [Edit][Del] |
|           150 contatos | 01 de fev, 2026     |
|           Meus melhores clientes para...     |
+----------------------------------------------+
```

---

## Resumo dos Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/components/broadcast/EditDatabaseDialog.tsx` | **NOVO** - Dialog para editar nome e descricao |
| `src/components/broadcast/LeadDatabaseSelector.tsx` | Adicionar botao de edicao e integrar dialog |

---

## Fluxo do Usuario

```text
1. Acessar Disparador de Leads
         |
         v
2. Selecionar Instancia
         |
         v
3. Ver lista de Bases de Leads
         |
         +---> Clicar no icone de edicao
         |           |
         |           v
         |     Dialog abre com nome e descricao
         |           |
         |           v
         |     Editar e salvar
         |
         v
4. Selecionar base e continuar disparo
   (pode usar qualquer instancia com acesso)
```

---

## Nota sobre Compartilhamento

O sistema ja permite que o usuario use qualquer uma de suas instancias com qualquer base de leads que criou. O fluxo atual:

1. Usuario seleciona uma instancia (de todas que tem acesso)
2. Usuario seleciona uma base de leads (de todas que criou)
3. Usuario dispara usando a instancia escolhida

Nao e necessaria nenhuma mudanca de banco de dados para "compartilhar" bases entre instancias, pois a arquitetura ja separa:
- `lead_databases` vinculado ao `user_id` (nao a instancia)
- O envio usa a instancia selecionada na etapa 1

Se futuramente desejar compartilhar bases entre usuarios diferentes (nao apenas instancias do mesmo usuario), seria necessario criar uma tabela de permissoes como `lead_database_access`.

