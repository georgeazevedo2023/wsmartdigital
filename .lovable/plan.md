
# Substituir Tabs por Navegacao com Botoes Customizados

## Problema

O componente `Tabs` do Radix UI continua com problemas de clique, possivelmente por conflito com re-renderizacoes do polling de status ou algum overlay invisivel na pagina.

## Solucao

Remover completamente o componente `Tabs` do Radix UI e substituir por uma navegacao manual usando botoes estilizados + renderizacao condicional. Isso elimina qualquer dependencia do estado interno do Radix e garante controle total sobre a troca de conteudo.

## Design Visual

A navegacao tera um estilo moderno com botoes pill/segmented, semelhante ao que ja aparece na screenshot do usuario, mas usando elementos HTML simples (`button`) em vez do componente Radix.

## Alteracoes

### `src/pages/dashboard/InstanceDetails.tsx`

1. Remover imports de `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
2. Manter o `useState('overview')` para `activeTab`
3. Criar botoes customizados para navegacao:

```tsx
const tabs = [
  { id: 'overview', label: 'Visao Geral' },
  { id: 'groups', label: 'Grupos' },
  { id: 'stats', label: 'Estatisticas' },
  { id: 'history', label: 'Historico' },
];

// Navegacao
<div className="flex w-full bg-muted rounded-lg p-1 gap-1">
  {tabs.map(tab => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
        activeTab === tab.id
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.label}
    </button>
  ))}
</div>

// Conteudo
<div className="mt-6">
  {activeTab === 'overview' && <InstanceOverview ... />}
  {activeTab === 'groups' && <InstanceGroups ... />}
  {activeTab === 'stats' && <InstanceStats ... />}
  {activeTab === 'history' && <InstanceHistory ... />}
</div>
```

4. Importar `cn` de `@/lib/utils` (se nao estiver importado)

Esta abordagem:
- Nao depende de nenhuma biblioteca de terceiros para a mecanica de abas
- Usa botoes HTML nativos que sempre sao clicaveis
- Mantem a mesma aparencia visual (estilo segmented control)
- Resolve definitivamente o problema de clique
