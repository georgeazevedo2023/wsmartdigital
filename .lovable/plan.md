

## Corrigir Ordem de Importacao SQL e Filtrar Dados Relevantes

### Problemas Identificados

1. **Ordem de importacao incorreta**: O SQL gerado coloca RLS policies e funcoes em blocos separados, mas o Supabase precisa que funcoes (como `is_super_admin`, `has_inbox_access`) sejam criadas ANTES das RLS policies que as referenciam. Atualmente a ordem depende de quais secoes o usuario seleciona e em que ordem sao processadas.

2. **Dados desnecessarios**: A exportacao inclui TODAS as tabelas, gerando arquivos enormes com conversas, mensagens, midias base64, etc. O objetivo e exportar apenas dados estruturais relevantes.

---

### Solucao

#### 1. Reestruturar a geracao SQL para ordem correta de importacao

A ordem correta para importacao no Supabase:

```text
1. ENUMs (tipos customizados)
2. Funcoes do banco (is_super_admin, has_role, etc.)
3. CREATE TABLE (estrutura)
4. PRIMARY KEYs (ja inclusos no CREATE TABLE)
5. FOREIGN KEYs (ALTER TABLE ADD CONSTRAINT)
6. INDEXes
7. RLS ENABLE (ALTER TABLE ENABLE ROW LEVEL SECURITY)
8. RLS POLICIES (CREATE POLICY - dependem das funcoes)
9. Storage Buckets + Policies
10. DADOS (INSERT INTO - apenas tabelas relevantes)
11. Triggers (dependem de funcoes e tabelas)
12. Usuarios Auth (comentarios informativos)
```

Modificar `generateSQL()` no `BackupModule.tsx` para gerar TUDO em um unico bloco ordenado, independente das secoes selecionadas.

#### 2. Filtrar tabelas na exportacao de dados

Criar uma lista de tabelas "relevantes para estrutura" e uma lista de tabelas "pesadas/irrelevantes" para excluir:

**Tabelas a INCLUIR nos dados:**
- `user_profiles` - perfis de usuarios
- `user_roles` - papeis dos usuarios
- `user_instance_access` - acesso a instancias
- `instances` - instancias WhatsApp
- `inboxes` - caixas de entrada
- `inbox_users` - usuarios das caixas
- `labels` - etiquetas
- `kanban_boards` - quadros kanban
- `kanban_columns` - colunas kanban
- `kanban_fields` - campos kanban
- `kanban_entities` - entidades kanban
- `kanban_entity_values` - valores de entidades
- `kanban_board_members` - membros dos quadros
- `lead_databases` - bases de leads (meta)
- `message_templates` - templates de mensagem
- `shift_report_configs` - configs de relatorio
- `scheduled_messages` - mensagens agendadas

**Tabelas a EXCLUIR dos dados (pesadas/transientes):**
- `conversations` - conversas (muito volume)
- `conversation_messages` - mensagens (base64, volume enorme)
- `conversation_labels` - labels de conversas
- `contacts` - contatos (pode ter milhares)
- `broadcast_logs` - logs de broadcast
- `instance_connection_logs` - logs de conexao
- `scheduled_message_logs` - logs de agendamentos
- `shift_report_logs` - logs de relatorios
- `lead_database_entries` - entradas de leads (volume)
- `kanban_cards` - cards kanban (volume)
- `kanban_card_data` - dados dos cards (volume)

#### 3. Adicionar indicador visual no frontend

Na secao "Dados das Tabelas", mostrar quais tabelas serao incluidas e informar que tabelas de alto volume sao excluidas para reduzir o tamanho do arquivo.

---

### Arquivos a Modificar

**`src/components/dashboard/BackupModule.tsx`:**
- Reordenar a logica de `generateSQL()` para gerar SQL na sequencia correta de importacao
- Adicionar constante `EXCLUDED_DATA_TABLES` com tabelas a excluir
- Filtrar tabelas no bloco de exportacao de dados
- Adicionar nota visual na secao de dados informando a filtragem
- Mover funcoes para ANTES das RLS policies na saida SQL
- Mover triggers para o FINAL do arquivo SQL

**`supabase/functions/database-backup/index.ts`:**
- Sem alteracoes necessarias (a filtragem sera feita no frontend)

---

### Detalhes Tecnicos da Reordenacao

O `generateSQL()` atual itera sobre `sections` na ordem do array e gera blocos independentes. A mudanca fara com que, quando multiplas secoes estiverem selecionadas, a geracao siga sempre a ordem logica de dependencias do PostgreSQL:

```text
Antes: Schema → Data → RLS → Functions → Users → Storage
Depois: ENUMs → Functions → Tables → FKs → Indexes → RLS → Storage → Data (filtrado) → Triggers → Users
```

Isso garante que o arquivo SQL possa ser executado de cima para baixo no SQL Editor do Supabase sem erros de dependencia.

