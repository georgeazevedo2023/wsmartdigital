

# Plano: Criar Seção "Leads" no Disparador

## Visao Geral
Criar um novo subitem "Leads" dentro do menu "Disparador" que permite importar contatos de múltiplas formas e enviar mensagens diretamente para números individuais (não grupos).

## Fluxo Proposto
```text
Instância > Importar Contatos > Mensagem
    [1]          [2]             [3]
```

**Etapa 1 - Instância:** Selecionar a instância WhatsApp (reutilizar componente existente)

**Etapa 2 - Importar Contatos:** Opções para:
- Importar de CSV/Excel (colar lista de numeros)
- Importar de grupos existentes (extrair membros)
- Adicionar manualmente

**Etapa 3 - Mensagem:** Compor e enviar (adaptar formulario existente para envio individual)

---

## Estrutura de Arquivos

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/dashboard/LeadsBroadcaster.tsx` | Pagina principal do fluxo de Leads |
| `src/components/broadcast/LeadImporter.tsx` | Componente para importar/adicionar contatos |
| `src/components/broadcast/LeadList.tsx` | Lista de contatos importados com selecao |
| `src/components/broadcast/LeadMessageForm.tsx` | Formulario de mensagem adaptado para leads |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/dashboard/Sidebar.tsx` | Adicionar link "Leads" no submenu Disparador |
| `src/App.tsx` | Adicionar rota `/dashboard/broadcast/leads` |

---

## Detalhes Tecnicos

### 1. Sidebar.tsx - Adicionar Link

Adicionar dentro do `CollapsibleContent` do Disparador:

```tsx
<Link
  to="/dashboard/broadcast/leads"
  className={cn(
    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
    isActive('/dashboard/broadcast/leads')
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
  )}
>
  <span>Leads</span>
</Link>
```

### 2. App.tsx - Adicionar Rota

```tsx
import LeadsBroadcaster from "./pages/dashboard/LeadsBroadcaster";
// ...
<Route path="broadcast/leads" element={<LeadsBroadcaster />} />
```

### 3. LeadsBroadcaster.tsx - Pagina Principal

Estrutura similar ao `Broadcaster.tsx`:
- State para step: 'instance' | 'import' | 'message'
- State para leads selecionados
- Progress bar de 3 etapas
- Navegacao entre etapas

### 4. LeadImporter.tsx - Importacao de Contatos

Tabs para diferentes metodos de importacao:
- **Colar Lista**: Textarea para colar numeros (um por linha ou separados por virgula)
- **De Grupos**: Buscar grupos e extrair membros (reutilizar logica do GroupSelector)
- **Manual**: Input para adicionar numeros individualmente

Interface do Lead:
```tsx
interface Lead {
  id: string;
  phone: string;        // Numero formatado
  name?: string;        // Nome opcional
  jid: string;          // JID para envio (phone@s.whatsapp.net)
  source: 'manual' | 'paste' | 'group';
  groupName?: string;   // Se veio de um grupo
}
```

### 5. LeadList.tsx - Lista de Contatos

- Exibir contatos importados com checkbox
- Busca por nome/numero
- Selecionar todos/limpar
- Contador de selecionados
- Deduplicacao automatica por numero

### 6. LeadMessageForm.tsx - Envio de Mensagens

Adaptar `BroadcastMessageForm.tsx` para:
- Enviar para numeros individuais (JID `@s.whatsapp.net`)
- Usar endpoint de mensagem direta (nao grupo)
- Manter funcionalidades: texto, midia, delay aleatorio
- Salvar logs no `broadcast_logs` (identificar como envio de leads)

---

## Diagrama do Fluxo

```text
+------------------+     +------------------+     +------------------+
|   1. Instância   | --> |  2. Importar     | --> |  3. Mensagem     |
|                  |     |     Contatos     |     |                  |
| [InstanceSelector]|    | - Colar lista    |     | - Texto          |
| (reutilizado)    |     | - De grupos      |     | - Mídia          |
|                  |     | - Manual         |     | - Preview        |
+------------------+     +------------------+     +------------------+
```

---

## Consideracoes

1. **API UAZAPI**: Verificar se o endpoint de envio para numeros individuais e diferente do envio para grupos. Provavelmente usa `send-message` com JID de numero ao inves de grupo.

2. **Formatacao de Numero**: Converter numeros brasileiros para formato JID:
   - Input: `11999998888` ou `+55 11 99999-8888`
   - JID: `5511999998888@s.whatsapp.net`

3. **Deduplicacao**: Ao importar de multiplas fontes, remover numeros duplicados automaticamente.

4. **Anti-Spam**: Manter o delay aleatorio para evitar bloqueios do WhatsApp.

5. **Logs**: Registrar envios de leads separadamente ou com flag especial no `broadcast_logs`.

