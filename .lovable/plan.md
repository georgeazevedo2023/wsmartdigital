
# Corrigir Abas e Implementar Historico Real de Conexoes

## Problema 1: Abas nao funcionando

Nos meus testes, as abas estao funcionando normalmente (cliquei em Grupos, Estatisticas e Historico e todas renderizaram conteudo). O problema pode ser intermitente ou estar relacionado ao carregamento da pagina. Para garantir robustez, vou:

- Adicionar `forceMount` nos `TabsContent` para pre-renderizar o conteudo (evita problemas de montagem tardia)
- Ou garantir que o estado `activeTab` esteja sincronizado corretamente

## Problema 2: Historico com dados mockados

Atualmente o `InstanceHistory` usa `getMockEvents()` que gera eventos falsos baseados apenas no `created_at` e `updated_at` da instancia. Para mostrar dados reais, preciso:

### 2.1 Criar tabela `instance_connection_logs`

Nova tabela no banco de dados para registrar eventos de conexao/desconexao:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid (PK) | Identificador unico |
| instance_id | text | ID da instancia (referencia instances.id) |
| event_type | text | Tipo: 'created', 'connected', 'disconnected', 'status_changed' |
| description | text | Descricao do evento |
| metadata | jsonb | Dados extras (owner_jid, status anterior, etc) |
| created_at | timestamptz | Momento do evento |
| user_id | uuid | Usuario que disparou o evento |

RLS: usuarios veem logs das suas proprias instancias; super_admins veem tudo.

### 2.2 Registrar eventos automaticamente

Nos pontos do codigo que alteram o status da instancia, inserir um registro na tabela:

- **`InstanceOverview.tsx`**: Quando conecta via QR Code (evento `connected`)
- **`InstanceDetails.tsx`**: Quando o polling detecta mudanca de status (evento `connected` ou `disconnected`)
- **`DashboardHome.tsx`** / polling de status: Quando detecta mudanca de status

Tambem criar um trigger no banco que registra automaticamente quando o campo `status` da tabela `instances` muda.

### 2.3 Atualizar `InstanceHistory.tsx`

- Remover `getMockEvents()` e dados mockados
- Buscar dados reais da tabela `instance_connection_logs`
- Manter o layout de timeline existente
- Adicionar paginacao ou limite de eventos (ex: ultimos 50)
- Remover o card informativo que diz "historico completo sera implementado"

## Alteracoes por arquivo

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Migration SQL | Criar | Tabela `instance_connection_logs` com RLS |
| Migration SQL | Criar | Trigger na tabela `instances` para registrar mudancas de status automaticamente |
| `src/components/instance/InstanceHistory.tsx` | Reescrever | Buscar dados reais do banco em vez de mockados |
| `src/components/instance/InstanceOverview.tsx` | Modificar | Registrar evento de conexao quando QR code e escaneado |
| `src/pages/dashboard/InstanceDetails.tsx` | Modificar | Registrar evento quando polling detecta mudanca de status |

## Detalhes Tecnicos

### Trigger SQL para capturar mudancas de status

```sql
CREATE OR REPLACE FUNCTION log_instance_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO instance_connection_logs (instance_id, event_type, description, metadata, user_id)
    VALUES (
      NEW.id,
      CASE WHEN NEW.status = 'connected' THEN 'connected' ELSE 'disconnected' END,
      CASE WHEN NEW.status = 'connected' 
        THEN 'Conectado ao WhatsApp'
        ELSE 'Desconectado do WhatsApp'
      END,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'owner_jid', NEW.owner_jid
      ),
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### InstanceHistory - busca de dados reais

```typescript
const fetchLogs = async () => {
  const { data, error } = await supabase
    .from('instance_connection_logs')
    .select('*')
    .eq('instance_id', instance.id)
    .order('created_at', { ascending: false })
    .limit(50);
  // ...
};
```

### Seed inicial

Ao criar a tabela, inserir um registro inicial de "created" para cada instancia existente baseado no `created_at` da instancia, para que o historico nao comece vazio.
