

# Substituir Dropdown por Selecao Multipla de Bases de Leads

## Situacao Atual

Na etapa 2 do Disparador de Leads, a selecao de base usa um dropdown (`Select`) que permite escolher apenas uma base por vez. O usuario quer:
1. Remover o dropdown
2. Exibir as bases como cards/lista (similar ao `LeadDatabaseSelector` que ja existe mas nao esta sendo usado nesta tela)
3. Permitir selecionar multiplas bases, combinando os leads de todas

## Mudancas

### Arquivo: `src/pages/dashboard/LeadsBroadcaster.tsx`

1. **Trocar `selectedDatabase` (singular) por `selectedDatabases` (array)**
   - `useState<LeadDatabase | null>(null)` vira `useState<LeadDatabase[]>([])`
   - Todas as referencias a `selectedDatabase` serao atualizadas

2. **Remover o dropdown `Select`** (linhas 576-597) e substituir por uma lista de cards com checkboxes
   - Cada card mostra nome da base, quantidade de contatos e data
   - Clicar no card alterna a selecao (checkbox visual)
   - Manter botao "Criar Nova Base" no topo

3. **Ao selecionar/deselecionar bases, carregar e mesclar leads**
   - Quando bases sao selecionadas, buscar leads de todas as selecionadas
   - Deduplicar por numero de telefone (mesmo lead em bases diferentes nao duplica)
   - Mostrar badge com o nome da base de origem em cada lead

4. **Atualizar `BroadcasterHeader`** para mostrar nomes das bases selecionadas (ex: "Base A, Base B") ou quantidade

5. **Ajustar logica de salvar/atualizar**
   - "Salvar" so se aplica quando criando nova base
   - "Atualizar" so funciona se exatamente uma base estiver selecionada
   - Remover botao "Salvar" quando multiplas bases estao selecionadas

6. **Condicao para avancar**: ter pelo menos uma base selecionada OU estar criando nova base (com leads importados)

### Detalhes Tecnicos

**Estado atualizado:**
```typescript
const [selectedDatabases, setSelectedDatabases] = useState<LeadDatabase[]>([]);
```

**Toggle de selecao:**
```typescript
const handleToggleDatabase = async (db: LeadDatabase) => {
  const isSelected = selectedDatabases.some(d => d.id === db.id);
  const newSelection = isSelected 
    ? selectedDatabases.filter(d => d.id !== db.id)
    : [...selectedDatabases, db];
  setSelectedDatabases(newSelection);
  // Recarregar leads de todas as bases selecionadas
  await loadLeadsFromDatabases(newSelection);
};
```

**Carregar leads mesclados:**
```typescript
const loadLeadsFromDatabases = async (dbs: LeadDatabase[]) => {
  if (dbs.length === 0) { setLeads([]); return; }
  const ids = dbs.map(d => d.id);
  const { data } = await supabase
    .from('lead_database_entries')
    .select('*')
    .in('database_id', ids);
  // Deduplicar por phone
  const seen = new Set<string>();
  const uniqueLeads = (data || []).filter(entry => {
    if (seen.has(entry.phone)) return false;
    seen.add(entry.phone);
    return true;
  });
  // Mapear para Lead[]
};
```

**UI dos cards (substituindo o dropdown):**
```typescript
<div className="space-y-2">
  <Button variant="outline" className="w-full border-dashed" onClick={handleCreateNew}>
    <Plus /> Criar Nova Base
  </Button>
  {databases.map(db => (
    <div 
      key={db.id}
      onClick={() => handleToggleDatabase(db)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer",
        selectedDatabases.some(d => d.id === db.id) 
          ? "border-primary bg-primary/5" 
          : "border-border/50"
      )}
    >
      <Checkbox checked={selectedDatabases.some(d => d.id === db.id)} />
      <Database className="w-5 h-5" />
      <div>
        <span className="font-medium">{db.name}</span>
        <span className="text-xs text-muted-foreground">{db.leads_count} contatos</span>
      </div>
    </div>
  ))}
</div>
```

### Arquivo: `src/components/broadcast/BroadcasterHeader.tsx`

- Atualizar prop `database` para aceitar `LeadDatabase[] | LeadDatabase | null`
- Exibir nomes das bases separados por virgula ou "X bases selecionadas"

## Arquivos Modificados
- `src/pages/dashboard/LeadsBroadcaster.tsx` - logica principal e UI
- `src/components/broadcast/BroadcasterHeader.tsx` - exibir multiplas bases

