
# Criar Base de Leads a partir de Participantes de Grupos

## Visao Geral
Adicionar funcionalidade no Broadcaster de Grupos que permite criar uma nova base de leads persistente a partir dos participantes (nao-admins) dos grupos selecionados, salvando diretamente no banco de dados.

---

## Fluxo Atual vs Novo

| Fluxo Atual | Novo Fluxo |
|-------------|------------|
| Grupos > Enviar mensagem imediata | Grupos > Criar base de leads OU Enviar mensagem |
| Participantes sao temporarios | Participantes salvos permanentemente em lead_databases |
| Sem reutilizacao | Base pode ser reutilizada no Leads Broadcaster |

---

## Mudancas na Interface

### Pagina Broadcaster.tsx (Passo 2 - Selecao de Grupos)

Adicionar um botao secundario "Criar Base de Leads" ao lado do botao "Continuar":

```
+--------------------------------------------------+
|  [X] grupos selecionados                         |
|                                                  |
|  [Criar Base de Leads]  [Continuar com X grupos] |
+--------------------------------------------------+
```

Ao clicar em "Criar Base de Leads":
1. Abre um Dialog solicitando nome da base
2. Extrai participantes nao-admin de todos os grupos selecionados
3. Salva na tabela lead_databases e lead_database_entries
4. Exibe toast de sucesso com link para Leads Broadcaster

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/dashboard/Broadcaster.tsx` | Adicionar botao e dialog para criar base de leads |
| `src/components/broadcast/CreateLeadDatabaseDialog.tsx` | Novo componente de dialog |

---

## Novo Componente: CreateLeadDatabaseDialog.tsx

```
src/components/broadcast/CreateLeadDatabaseDialog.tsx
```

**Props:**
- `open: boolean` - controla visibilidade
- `onOpenChange: (open: boolean) => void`
- `groups: Group[]` - grupos selecionados com participantes
- `onSuccess?: () => void` - callback apos sucesso

**Funcionalidades:**
1. Input para nome da base
2. Input opcional para descricao
3. Exibe preview: X grupos, Y participantes unicos
4. Botao "Criar Base" que:
   - Valida se tem nome
   - Extrai participantes nao-admin (deduplicados por telefone)
   - Insere em lead_databases
   - Insere entradas em lead_database_entries
   - Exibe toast de sucesso

---

## Logica de Extracao

```typescript
// Extrair participantes unicos nao-admin
const extractLeadsFromGroups = (groups: Group[]) => {
  const seenPhones = new Set<string>();
  const leads = [];

  for (const group of groups) {
    for (const participant of group.participants) {
      // Pular admins
      if (participant.isAdmin || participant.isSuperAdmin) continue;
      
      // Extrair telefone do JID ou phoneNumber
      const phoneMatch = (participant.phoneNumber || participant.jid)?.match(/^(\d+)@/);
      if (!phoneMatch) continue;
      
      const phone = phoneMatch[1];
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);

      leads.push({
        phone: formatPhone(phone),
        name: participant.name || null,
        jid: `${phone}@s.whatsapp.net`,
        source: 'group',
        group_name: group.name,
      });
    }
  }

  return leads;
};
```

---

## Detalhes do Dialog

```
+--------------------------------------------------+
|  Criar Base de Leads                        [X]  |
+--------------------------------------------------+
|                                                  |
|  Nome da Base *                                  |
|  [________________________]                      |
|                                                  |
|  Descricao (opcional)                            |
|  [________________________]                      |
|                                                  |
|  Preview:                                        |
|  - 5 grupos selecionados                         |
|  - 127 participantes unicos (excl. admins)       |
|                                                  |
+--------------------------------------------------+
|                    [Cancelar]  [Criar Base]      |
+--------------------------------------------------+
```

---

## Estrutura do Banco (Existente)

As tabelas ja existem:

**lead_databases:**
- id, name, description, user_id, leads_count, created_at, updated_at

**lead_database_entries:**
- id, database_id, phone, name, jid, source, group_name, is_verified, verified_name, verification_status

---

## Mudancas em Broadcaster.tsx

### Adicionar imports
```typescript
import CreateLeadDatabaseDialog from '@/components/broadcast/CreateLeadDatabaseDialog';
import { Database } from 'lucide-react';
```

### Adicionar estado
```typescript
const [showCreateDatabaseDialog, setShowCreateDatabaseDialog] = useState(false);
```

### Modificar o bloco de botoes (Step 2)
Adicionar botao "Criar Base" antes do "Continuar":

```tsx
{selectedGroups.length > 0 && (
  <div className="flex justify-end gap-2 pt-2 border-t">
    <Button 
      variant="outline" 
      onClick={() => setShowCreateDatabaseDialog(true)}
    >
      <Database className="w-4 h-4 mr-2" />
      Criar Base de Leads
    </Button>
    <Button onClick={handleContinueToMessage}>
      Continuar com {selectedGroups.length} grupo{selectedGroups.length !== 1 ? 's' : ''}
      <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  </div>
)}
```

### Adicionar o Dialog
```tsx
<CreateLeadDatabaseDialog
  open={showCreateDatabaseDialog}
  onOpenChange={setShowCreateDatabaseDialog}
  groups={selectedGroups}
  onSuccess={() => {
    setShowCreateDatabaseDialog(false);
    toast.success('Base criada! Acesse em Disparador > Leads');
  }}
/>
```

---

## Validacoes

1. Nome da base obrigatorio
2. Pelo menos 1 participante valido (com numero)
3. Tratamento de erro se falhar insercao no banco
4. Prevenir duplicatas se ja existe base com mesmo nome

---

## Resultado Esperado

1. Usuario seleciona grupos no Broadcaster
2. Clica em "Criar Base de Leads"
3. Preenche nome da base
4. Clica em "Criar Base"
5. Sistema salva os participantes como leads
6. Toast de sucesso aparece
7. Usuario pode ir para Leads Broadcaster e usar a base

---

## Checklist de Validacao

1. Verificar que o botao aparece quando grupos estao selecionados
2. Testar criacao de base com 1 grupo
3. Testar criacao de base com multiplos grupos
4. Verificar deduplicacao (mesmo participante em 2 grupos = 1 lead)
5. Verificar que admins sao excluidos
6. Confirmar que a base aparece no Leads Broadcaster
7. Verificar contagem de leads esta correta
