
# Plano: Mover Histórico de Envios para Submenu do Disparador

## Objetivo
Remover o componente de Histórico de Envios da página principal do Disparador e transformá-lo em uma página separada acessível através de um submenu colapsável no sidebar, similar ao funcionamento do menu "Instâncias".

---

## Situação Atual

1. **Sidebar**: O menu "Disparador" é um link simples sem submenu
2. **Broadcaster.tsx**: A página contém tanto o formulário de disparo quanto o `<BroadcastHistory />` no final
3. **Rotas**: Apenas `/dashboard/broadcast` existe para o disparador

---

## Mudanças Necessárias

### 1. Criar Nova Página para o Histórico

Criar `src/pages/dashboard/BroadcastHistoryPage.tsx` que:
- Renderiza o componente `BroadcastHistory` como página principal
- Mantém funcionalidade de "Reenviar" que redireciona para `/dashboard/broadcast` com os dados

### 2. Adicionar Rota no App.tsx

```
/dashboard/broadcast          → Broadcaster (sem histórico)
/dashboard/broadcast/history  → BroadcastHistoryPage
```

### 3. Modificar Sidebar

Transformar o link "Disparador" em um menu colapsável com submenu:
- **Novo disparo** → `/dashboard/broadcast`
- **Histórico** → `/dashboard/broadcast/history`

### 4. Remover Histórico do Broadcaster.tsx

Remover a linha `<BroadcastHistory onResend={handleResend} />` da página principal do disparador.

---

## Layout da Sidebar (Novo)

```
┌─────────────────────────────────┐
│ 🏠 Dashboard                    │
├─────────────────────────────────┤
│ 📤 Disparador              ▼    │
│    ├─ Novo disparo              │
│    └─ Histórico                 │
├─────────────────────────────────┤
│ 📅 Agendamentos                 │
├─────────────────────────────────┤
│ 🖥️ Instâncias               ▼    │
│    ├─ Todas as instâncias       │
│    └─ ...                       │
└─────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/dashboard/BroadcastHistoryPage.tsx` | **Criar** - Nova página para histórico |
| `src/App.tsx` | Adicionar rota `/dashboard/broadcast/history` |
| `src/components/dashboard/Sidebar.tsx` | Transformar Disparador em menu colapsável |
| `src/pages/dashboard/Broadcaster.tsx` | Remover `<BroadcastHistory />` e ajustar "Reenviar" |

---

## Detalhes Técnicos

### Nova Página: BroadcastHistoryPage.tsx

```typescript
import BroadcastHistory from '@/components/broadcast/BroadcastHistory';
import { useNavigate } from 'react-router-dom';

const BroadcastHistoryPage = () => {
  const navigate = useNavigate();

  const handleResend = (log) => {
    // Salvar dados no sessionStorage e navegar
    sessionStorage.setItem('resendData', JSON.stringify({
      messageType: log.message_type,
      content: log.content,
      mediaUrl: log.media_url,
      instanceId: log.instance_id,
      instanceName: log.instance_name,
    }));
    navigate('/dashboard/broadcast');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Envios</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie o histórico de mensagens enviadas
        </p>
      </div>
      <BroadcastHistory onResend={handleResend} />
    </div>
  );
};
```

### Sidebar com Submenu Disparador

Criar estrutura Collapsible similar ao menu de Instâncias:

```typescript
// Adicionar state para controlar abertura
const [broadcastOpen, setBroadcastOpen] = useState(true);

// Detectar se está ativo
const isBroadcastActive = location.pathname.startsWith('/dashboard/broadcast');

// Submenu items
const broadcastItems = [
  { label: 'Novo disparo', path: '/dashboard/broadcast' },
  { label: 'Histórico', path: '/dashboard/broadcast/history' },
];
```

### Atualizar Broadcaster.tsx

1. Remover importação do `BroadcastHistory`
2. Remover linha `<BroadcastHistory onResend={handleResend} />`
3. Ler dados de reenvio do `sessionStorage` no `useEffect`
4. Limpar `sessionStorage` após usar os dados

---

## Fluxo de Reenvio Atualizado

```
1. Usuário está em /dashboard/broadcast/history
2. Clica em "Reenviar" em uma mensagem
3. Dados são salvos no sessionStorage
4. Navega para /dashboard/broadcast
5. Broadcaster lê dados do sessionStorage
6. Exibe banner de reenvio e pré-carrega dados
7. Limpa sessionStorage
```

---

## Benefícios

- **Organização**: Histórico separado da área de disparo
- **Performance**: Página de disparo carrega mais rápido sem histórico
- **UX**: Menu colapsável consistente com o padrão de Instâncias
- **Navegação**: Acesso direto ao histórico pelo sidebar
