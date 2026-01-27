
# Plano: Limpar instâncias órfãs durante sincronização

## Problema Identificado
Quando uma instância é excluída diretamente na API da UAZAPI, ela continua aparecendo no sistema local porque o fluxo de sincronização atual apenas **importa** novas instâncias, mas **não remove** as que não existem mais na API.

No seu caso, a instância "teste" foi removida na UAZAPI, não aparece mais na lista de sincronização, mas ainda existe no banco de dados local.

---

## Solução Proposta

Adicionar uma funcionalidade de **limpeza automática** no `SyncInstancesDialog` que:

1. Identifica instâncias locais que **não existem mais** na UAZAPI
2. Exibe essas instâncias em uma seção separada "Instâncias Órfãs"
3. Permite ao Super Admin selecionar e **remover** essas instâncias do sistema local

---

## Mudanças no Código

### Arquivo: `src/components/dashboard/SyncInstancesDialog.tsx`

**1. Identificar instâncias órfãs**

Modificar o `fetchData` para também buscar todas as instâncias locais e compará-las com as da UAZAPI:

```typescript
// Buscar TODAS as instâncias locais (não só os IDs)
const { data: localInstances } = await supabase
  .from('instances')
  .select('id, name, status, user_id');

// IDs das instâncias na UAZAPI
const uazapiIds = new Set(instances.map(i => i.id));

// Instâncias locais que NÃO existem na UAZAPI = órfãs
const orphaned = localInstances?.filter(inst => !uazapiIds.has(inst.id)) || [];
```

**2. Adicionar novo estado para instâncias órfãs**

```typescript
const [orphanedInstances, setOrphanedInstances] = useState<LocalInstance[]>([]);
const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
const [deletingOrphans, setDeletingOrphans] = useState(false);
```

**3. Exibir seção "Instâncias Órfãs" no modal**

Adicionar uma nova seção visual (com ícone de alerta) mostrando instâncias que existem localmente mas não na UAZAPI:

```
text
┌─────────────────────────────────────────────────┐
│  ⚠️ Instâncias Órfãs (1)                        │
│  Existem no sistema local mas não na UAZAPI     │
├─────────────────────────────────────────────────┤
│  ☐ teste • Desconectado                         │
│    Não encontrada na UAZAPI - pode ser removida │
└─────────────────────────────────────────────────┘
```

**4. Adicionar botão "Remover Órfãs"**

No `DialogFooter`, adicionar um botão para excluir as instâncias selecionadas:

```typescript
<Button
  variant="destructive"
  onClick={handleDeleteOrphans}
  disabled={deletingOrphans || selectedOrphans.size === 0}
>
  Remover Órfãs ({selectedOrphans.size})
</Button>
```

**5. Implementar lógica de remoção**

```typescript
const handleDeleteOrphans = async () => {
  setDeletingOrphans(true);
  try {
    // Remover registros de acesso relacionados primeiro
    for (const id of selectedOrphans) {
      await supabase.from('user_instance_access').delete().eq('instance_id', id);
    }
    
    // Remover instâncias
    const { error } = await supabase
      .from('instances')
      .delete()
      .in('id', Array.from(selectedOrphans));
    
    if (error) throw error;
    
    toast.success(`${selectedOrphans.size} instância(s) removida(s)`);
    onSync(); // Atualiza lista principal
    fetchData(); // Recarrega dados do modal
    setSelectedOrphans(new Set());
  } catch (err) {
    toast.error('Erro ao remover instâncias');
  } finally {
    setDeletingOrphans(false);
  }
};
```

---

## Detalhes Técnicos

### Relacionamentos a considerar na exclusão

Quando uma instância é removida, precisamos limpar:

1. `user_instance_access` - Registros de acesso do usuário (não tem CASCADE)
2. `scheduled_messages` - Tem `ON DELETE CASCADE`, será limpo automaticamente
3. `broadcast_logs` - Verificar se tem referência à instância

### Fluxo visual do modal atualizado

```
text
┌────────────────────────────────────────────────────────┐
│  🔄 Sincronizar Instâncias da UAZAPI                   │
├────────────────────────────────────────────────────────┤
│  Novas Instâncias (0)                                  │
│  (nenhuma nova instância disponível)                   │
├────────────────────────────────────────────────────────┤
│  Já Sincronizadas (5)                                  │
│  ✓ Casa Do Agricultor Vitória • Conectado              │
│  ✓ CDA | Consultório Vet • Conectado                   │
│  ...                                                   │
├────────────────────────────────────────────────────────┤
│  ⚠️ Instâncias Órfãs (1)                               │
│  ☐ teste • Não encontrada na UAZAPI                    │
├────────────────────────────────────────────────────────┤
│        [Cancelar]   [Remover Órfãs (0)]   [Importar]   │
└────────────────────────────────────────────────────────┘
```

---

## Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/SyncInstancesDialog.tsx` | Adicionar lógica de detecção e remoção de órfãs |

---

## Benefícios

- Mantém o banco de dados local sincronizado com a UAZAPI
- Evita acúmulo de instâncias "fantasma" que causam confusão
- Dá controle ao Super Admin sobre o que remover (não é automático)
- Mostra claramente quais instâncias estão desatualizadas
