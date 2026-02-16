

# Correcao do nome do contato no Helpdesk

## Problema

O contato com telefone `558193856099` (que e o George) esta registrado no banco com o nome "Neo Blindados". Isso faz com que tanto a lista lateral quanto o cabecalho do chat exibam "Neo Blindados" em vez de "George".

Existe apenas **1 registro** de contato (`be02bb05-c06a-469e-8a82-3f41a924cf1e`) vinculado a **2 conversas** diferentes. Ao corrigir o nome nesse unico registro, ambas as conversas serao atualizadas.

## Solucao

1. **Atualizar o nome do contato** no banco de dados de "Neo Blindados" para "George"
   - Tabela: `contacts`
   - ID: `be02bb05-c06a-469e-8a82-3f41a924cf1e`
   - Campo `name`: "Neo Blindados" -> "George"

2. **Investigar o webhook** para entender por que o nome esta sendo sobrescrito (o webhook pode estar atualizando o nome do contato com o `pushName` ou `verifiedBizName` vindo da API, o que sobrescreve nomes ja corrigidos manualmente)

## Observacao importante

Se o webhook continuar sobrescrevendo o nome com dados da API, a correcao manual sera temporaria. Caso isso aconteca, sera necessario ajustar a logica do webhook para nao sobrescrever nomes de contatos ja existentes, ou dar prioridade a nomes editados manualmente.

## Detalhes tecnicos

- Query de correcao:
```text
UPDATE contacts SET name = 'George' WHERE id = 'be02bb05-c06a-469e-8a82-3f41a924cf1e';
```
- Verificar no `whatsapp-webhook/index.ts` se ha logica de upsert que sobrescreve o campo `name` do contato a cada mensagem recebida

