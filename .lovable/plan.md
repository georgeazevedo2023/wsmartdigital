
# Reestruturar Menu Lateral: Atendimento com Subitens e Menus Fechados por Padrao

## Resumo

Duas mudancas no Sidebar:
1. **Todos os menus collapsiveis iniciam fechados** (Disparador, Instancias e o novo Atendimento)
2. **"Atendimento" vira menu collapsivel** com estrutura hierarquica: cada instancia que possui caixa de entrada aparece como subitem, e dentro dela, suas caixas de entrada

### Estrutura visual do menu

```text
Dashboard
Atendimento          v
  motorac
    Vendas 01 - Wsmart
Agendamentos
Disparador           >
Instancias           >
```

## Mudancas Tecnicas

### Arquivo: `src/components/dashboard/Sidebar.tsx`

1. **Estados iniciais fechados**
   - `instancesOpen` e `broadcastOpen` mudam de `true` para `false`
   - Novo estado `helpdeskOpen` iniciando em `false`

2. **Buscar inboxes junto com instancias**
   - Na funcao `fetchInstances`, tambem buscar as inboxes agrupadas por `instance_id`
   - Novo estado `inboxes` para armazenar a relacao instancia -> caixas de entrada

3. **Remover "Atendimento" dos `navItems`** (item simples) e transformar em `Collapsible`
   - Listar apenas instancias que possuem pelo menos uma inbox
   - Cada instancia e um subitem com nome e indicador de status
   - Dentro de cada instancia, listar as caixas de entrada como links clicaveis
   - Clicar em uma inbox navega para `/dashboard/helpdesk?inbox=ID_DA_INBOX`

4. **Comportamento no sidebar colapsado**
   - Quando colapsado, "Atendimento" vira um icone simples que leva a `/dashboard/helpdesk` (mesmo padrao dos outros menus collapsiveis)

5. **Rota do HelpDesk**
   - Nenhuma mudanca de rota necessaria; a pagina HelpDesk ja existe em `/dashboard/helpdesk`
   - A inbox selecionada sera passada via query param `?inbox=ID`

### Arquivo: `src/pages/dashboard/HelpDesk.tsx`

- Ler o query param `inbox` da URL e pre-selecionar a caixa de entrada correspondente ao abrir a pagina (ajuste menor)

## Arquivos Modificados
- `src/components/dashboard/Sidebar.tsx` - reestruturacao principal do menu
- `src/pages/dashboard/HelpDesk.tsx` - leitura do query param de inbox (ajuste menor)
