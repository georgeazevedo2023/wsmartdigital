
# Implementação: Corrigir Exibição de Participantes

## Alteração a Realizar

Modificar a função `fetchGroupsStats` no arquivo `DashboardHome.tsx` para verificar corretamente os campos da UAZAPI em PascalCase.

### Código Atual (linhas 117-120)
```typescript
// Sum participants from each group
groups.forEach((group: { size?: number; participants?: unknown[] }) => {
  totalParticipants += group.size || group.participants?.length || 0;
});
```

### Código Corrigido
```typescript
// Sum participants from each group
// UAZAPI returns fields in PascalCase, check all possible formats
groups.forEach((group: Record<string, unknown>) => {
  const participantCount = 
    (group.ParticipantCount as number) ||
    (group.Size as number) ||
    (group.size as number) ||
    (Array.isArray(group.Participants) ? group.Participants.length : 0) ||
    (Array.isArray(group.participants) ? group.participants.length : 0) ||
    0;
  totalParticipants += participantCount;
});
```

## Arquivo a Modificar

| Arquivo | Linha | Modificação |
|---------|-------|-------------|
| `src/pages/dashboard/DashboardHome.tsx` | 117-120 | Atualizar parsing para verificar campos PascalCase |

## Resultado Esperado

- O KPI "Total de Participantes" exibirá a soma real de todos os membros
- Cada card de instância mostrará a contagem correta de participantes
- Funcionará independentemente do formato retornado pela UAZAPI (PascalCase ou camelCase)
