
# Melhorar Ícones e Alinhamento do Sidebar

## Problemas Identificados

1. **Ícones duplicados**: Disparador e Instâncias aparecem duas vezes no modo colapsado
2. **Alinhamento inconsistente**: Os ícones não estão perfeitamente centralizados
3. **Ícones similares**: Alguns ícones são muito parecidos visualmente

---

## Solução

### 1. Remover duplicação de ícones

**Problema**: O código atual renderiza os botões do Collapsible **sempre** e depois adiciona links separados **quando colapsado**. Isso causa duplicação.

**Solução**: Usar renderização condicional correta - quando colapsado, mostrar apenas os links simples (sem o Collapsible).

```typescript
// Disparador - apenas quando NÃO colapsado
{!collapsed && (
  <Collapsible ...>
    ...
  </Collapsible>
)}

// Link simples - apenas quando colapsado
{collapsed && (
  <Link to="/dashboard/broadcast" ...>
    <Megaphone />
  </Link>
)}
```

---

### 2. Melhorar alinhamento quando colapsado

Centralizar todos os ícones consistentemente:

```typescript
// Todos os links colapsados terão:
className={cn(
  'flex items-center justify-center px-3 py-2.5 rounded-lg transition-all mx-auto',
  // ...
)}
```

---

### 3. Trocar ícones para maior distinção visual

| Item | Atual | Novo | Motivo |
|------|-------|------|--------|
| Dashboard | `LayoutGrid` | `LayoutDashboard` | Mais reconhecível como dashboard |
| Agendamentos | `CalendarClock` | `Clock` | Mais clean e distinto |
| Disparador | `Megaphone` | `Send` | Mais direto para "enviar mensagens" |
| Instâncias | `Smartphone` | `MonitorSmartphone` | Diferencia de outros ícones |
| Usuários | `UsersRound` | `Users` | Mais clássico |
| Configurações | `SlidersHorizontal` | `Settings` | Universalmente reconhecido |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/Sidebar.tsx` | Corrigir duplicação, alinhamento e ícones |

---

## Resultado Esperado

- Cada ícone aparece apenas **uma vez** no sidebar colapsado
- Ícones perfeitamente centralizados
- Visual mais limpo e profissional
- Ícones mais distintos entre si
