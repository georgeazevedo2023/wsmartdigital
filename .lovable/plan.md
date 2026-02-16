
# Aumentar area da lista de conversas do Helpdesk

## Problema

A coluna da lista de conversas tem largura `w-72` (288px) no padrao e `w-80` (320px) em telas grandes (`lg`). Isso faz com que as abas de status ("Abertas", "Pendentes", "Resolvidas", "Todas") nao caibam e a palavra "Todas" fique cortada.

## Solucao

Aumentar a largura da coluna da lista de conversas em `src/pages/dashboard/HelpDesk.tsx` (linha 488):

- De `w-72 lg:w-80` para `w-80 lg:w-96` (320px padrao, 384px em telas grandes)

Isso garante que as 4 abas de status caibam confortavelmente sem cortar texto, alem de melhorar a legibilidade das mensagens na lista.

## Detalhes tecnicos

**Arquivo**: `src/pages/dashboard/HelpDesk.tsx`, linha 488

Alteracao simples de classes CSS:
- `w-72 lg:w-80` -> `w-80 lg:w-96`

Nenhuma outra alteracao necessaria.
