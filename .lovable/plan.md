
# Plano: Bases de Dados de Leads

## Objetivo
Criar um sistema que permite:
1. Nomear e salvar listas de leads importadas como "bases de dados"
2. Persistir essas bases no banco de dados
3. Ao disparar mensagens, selecionar qual base de leads usar

## Arquitetura

### 1. Nova Tabela no Banco de Dados

Criar tabela `lead_databases` para armazenar as bases:

```sql
CREATE TABLE lead_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  leads_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: usuarios so veem suas proprias bases
ALTER TABLE lead_databases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own lead databases" ON lead_databases
  FOR ALL USING (auth.uid() = user_id);
```

Criar tabela `lead_database_entries` para armazenar os contatos:

```sql
CREATE TABLE lead_database_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL REFERENCES lead_databases(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  jid text NOT NULL,
  is_verified boolean DEFAULT false,
  verified_name text,
  verification_status text, -- 'valid', 'invalid', 'error', null
  source text DEFAULT 'paste', -- 'paste', 'manual', 'group', 'csv'
  group_name text,
  created_at timestamptz DEFAULT now()
);

-- Index para buscas
CREATE INDEX idx_lead_entries_database ON lead_database_entries(database_id);

-- RLS via join com lead_databases
ALTER TABLE lead_database_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage entries via database ownership" ON lead_database_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lead_databases 
      WHERE lead_databases.id = lead_database_entries.database_id 
      AND lead_databases.user_id = auth.uid()
    )
  );
```

### 2. Novo Fluxo do Usuario

```text
DISPARADOR DE LEADS
     |
     v
Etapa 1: Selecionar Instancia
     |
     v
Etapa 2: Escolher Base de Leads  <-- NOVA ETAPA
     |
     +---> [Criar Nova Base] --> Importar Contatos --> Dar Nome --> Salvar
     |
     +---> [Usar Base Existente] --> Carregar do Banco
     |
     v
Etapa 3: Ver/Editar Leads + Verificar
     |
     v
Etapa 4: Compor Mensagem e Enviar
```

### 3. Componentes a Criar/Modificar

**Novo: `LeadDatabaseSelector.tsx`**
- Lista bases existentes com nome, quantidade e data
- Opcao de criar nova base
- Opcao de deletar bases
- Preview rapido dos primeiros contatos

**Modificar: `LeadsBroadcaster.tsx`**
- Adicionar nova etapa "database" entre "instance" e "import"
- Adicionar estado `selectedDatabase` e `databaseName`
- Ao importar leads, solicitar nome da base antes de salvar
- Ao continuar para mensagem, salvar automaticamente a base

**Modificar: `LeadImporter.tsx`**
- Adicionar callback `onSaveDatabase` 
- Apos importacao, permitir dar nome e salvar

### 4. Estrutura de Dados Atualizada

```typescript
// Interface para base de dados
interface LeadDatabase {
  id: string;
  name: string;
  description?: string;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

// Interface Lead (existente) - sem mudancas
interface Lead {
  id: string;
  phone: string;
  name?: string;
  jid: string;
  source: 'manual' | 'paste' | 'group';
  groupName?: string;
  isVerified?: boolean;
  verifiedName?: string;
  verificationStatus?: 'pending' | 'valid' | 'invalid' | 'error';
}
```

### 5. Mudancas Detalhadas por Arquivo

| Arquivo | Mudanca |
|---------|---------|
| `supabase/migrations/` | Criar tabelas lead_databases e lead_database_entries |
| `src/components/broadcast/LeadDatabaseSelector.tsx` | **NOVO** - Componente para listar/criar/deletar bases |
| `src/pages/dashboard/LeadsBroadcaster.tsx` | Adicionar etapa de selecao de base, logica de salvamento |
| `src/components/broadcast/LeadImporter.tsx` | Input para nome da base ao salvar |
| `src/integrations/supabase/types.ts` | Auto-gerado apos migration |

### 6. UI do Seletor de Bases

```text
+--------------------------------------------------+
| Bases de Leads                                   |
+--------------------------------------------------+
| [+ Criar Nova Base]                              |
|                                                  |
| +----------------------------------------------+ |
| | Clientes VIP                    150 contatos | |
| | Criada em 01/02/2026                    [...] | |
| +----------------------------------------------+ |
| | Leads Janeiro                    89 contatos | |
| | Criada em 15/01/2026                    [...] | |
| +----------------------------------------------+ |
| | Promocao Verao                  320 contatos | |
| | Criada em 10/01/2026                    [...] | |
| +----------------------------------------------+ |
+--------------------------------------------------+
```

### 7. Fluxo de Salvamento

1. Usuario importa contatos (qualquer metodo)
2. Sistema mostra modal/input pedindo nome da base
3. Ao confirmar:
   - Insere registro em `lead_databases`
   - Insere todos os leads em `lead_database_entries`
   - Atualiza `leads_count` na base
4. Usuario pode continuar para envio ou voltar

### 8. Funcionalidades Adicionais

- **Editar base**: Adicionar/remover contatos de uma base existente
- **Duplicar base**: Copiar base existente com novo nome
- **Exportar base**: Download CSV dos contatos
- **Historico**: Saber de qual base foi enviada cada campanha (opcional)

---

## Secao Tecnica

### Queries Principais

**Listar bases do usuario:**
```typescript
const { data } = await supabase
  .from('lead_databases')
  .select('*')
  .order('updated_at', { ascending: false });
```

**Carregar leads de uma base:**
```typescript
const { data } = await supabase
  .from('lead_database_entries')
  .select('*')
  .eq('database_id', selectedDatabase.id);
```

**Salvar nova base com leads:**
```typescript
// 1. Criar base
const { data: db } = await supabase
  .from('lead_databases')
  .insert({ name: databaseName, user_id: userId, leads_count: leads.length })
  .select()
  .single();

// 2. Inserir leads
const entries = leads.map(l => ({
  database_id: db.id,
  phone: l.phone,
  name: l.name,
  jid: l.jid,
  source: l.source,
  group_name: l.groupName,
  is_verified: l.isVerified,
  verified_name: l.verifiedName,
  verification_status: l.verificationStatus,
}));

await supabase.from('lead_database_entries').insert(entries);
```

### Consideracoes de Performance

- Para bases grandes (10k+ leads), usar paginacao na carga
- Indices no database_id para queries rapidas
- Considerar limite maximo de leads por base (ex: 50.000)
