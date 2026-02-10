
# Corrigir Abas Nao Clicaveis na Pagina de Detalhes da Instancia

## Diagnostico

Nos testes do navegador, as abas estao funcionando normalmente. Porem, o usuario reporta que nao consegue clicar nelas. A causa provavel e que re-renderizacoes causadas pelo `fetchInstance` e `updateInstanceStatus` podem estar interferindo com o estado interno do componente `Tabs` quando usado no modo nao controlado (`defaultValue`).

## Solucao

Trocar de `defaultValue` (nao controlado) para `value` + `onValueChange` (controlado), garantindo que o estado da aba ativa seja mantido mesmo apos re-renderizacoes. Tambem vou garantir que as atualizacoes de status nao causem ciclos de re-render que possam desmontar/remontar os componentes de aba.

## Alteracoes

### `src/pages/dashboard/InstanceDetails.tsx`

- Restaurar o estado controlado `activeTab` com `useState('overview')`
- Usar `value={activeTab}` e `onValueChange={setActiveTab}` no componente `Tabs`
- Manter `TabsContent` sem `forceMount` (que causou problemas antes)
- Garantir que `className="mt-6"` esteja presente em todos os `TabsContent`

### Codigo resultante

```tsx
const [activeTab, setActiveTab] = useState('overview');

// ...

<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="overview">Visao Geral</TabsTrigger>
    <TabsTrigger value="groups">Grupos</TabsTrigger>
    <TabsTrigger value="stats">Estatisticas</TabsTrigger>
    <TabsTrigger value="history">Historico</TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="mt-6">
    <InstanceOverview instance={instance} onUpdate={fetchInstance} />
  </TabsContent>
  <TabsContent value="groups" className="mt-6">
    <InstanceGroups instance={instance} />
  </TabsContent>
  <TabsContent value="stats" className="mt-6">
    <InstanceStats instance={instance} />
  </TabsContent>
  <TabsContent value="history" className="mt-6">
    <InstanceHistory instance={instance} />
  </TabsContent>
</Tabs>
```

Esta e uma alteracao minima -- apenas restaurar o estado controlado que foi removido na edicao anterior.
