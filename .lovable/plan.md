

## Modernizar o Wizard de Migracao - Automacao Completa com Logs em Tempo Real

### Visao Geral
Transformar o MigrationWizard de um processo manual (clicar passo a passo) para uma experiencia automatizada e moderna, com botao "Executar Tudo", painel de logs em tempo real, e testes de verificacao pos-migracao.

---

### Mudancas Principais

#### 1. Botao "Executar Todos os Passos"
Um botao principal que executa todos os 7 passos sequencialmente, pulando automaticamente para o proximo apos sucesso. Se um passo falhar, pausa e permite retry antes de continuar.

#### 2. Painel de Logs em Tempo Real
Cada passo retornara logs detalhados (nomes de tabelas criadas, funcoes, policies) que serao exibidos em um terminal/console visual ao lado dos passos. O edge function sera modificado para retornar detalhes granulares.

#### 3. Testes de Verificacao Pos-Migracao
Apos concluir todos os passos, executar verificacoes automaticas no banco externo:
- Contagem de tabelas criadas vs esperadas
- Contagem de funcoes, policies e triggers
- Verificacao de buckets de storage
- Comparativo lado a lado (origem vs destino)

#### 4. UI Moderna
- Timeline vertical animada conectando os passos
- Cores e animacoes de progresso por passo
- Tempo decorrido por passo e total
- Resumo final com estatisticas

---

### Detalhes Tecnicos

#### Arquivo: `supabase/functions/migrate-to-external/index.ts`

**Adicionar nova action `verify-migration`:**
Conecta ao banco externo e conta tabelas, funcoes, policies, triggers para comparar com o banco de origem.

```text
Action: verify-migration
Retorna: {
  source: { tables: N, functions: N, policies: N, triggers: N, buckets: N },
  target: { tables: N, functions: N, policies: N, triggers: N, buckets: N }
}
```

**Enriquecer retorno de cada action com `details[]`:**
Cada passo retornara um array `details` com descricoes das operacoes individuais (ex: "Tabela user_profiles criada", "Policy xyz aplicada").

Exemplo de retorno enriquecido:
```text
{
  success: 12,
  failed: 0,
  errors: [],
  details: [
    "ENUM app_role criado",
    "ENUM inbox_role criado",
    "Tabela user_profiles criada",
    "Tabela user_roles criada",
    ...
  ]
}
```

#### Arquivo: `src/components/dashboard/MigrationWizard.tsx`

**Reescrita completa com as seguintes secoes:**

1. **Estado expandido:**
   - `logs: string[]` - array de logs acumulados de todos os passos
   - `runningAll: boolean` - flag para execucao automatica
   - `stepTimings: Record<string, number>` - tempo em ms de cada passo
   - `verificationResult` - resultado da verificacao final
   - `totalElapsed: number` - tempo total decorrido

2. **Funcao `handleRunAll()`:**
   - Itera pelos passos na ordem
   - Executa cada um, acumula logs
   - Se falhar, pausa e mostra opcao de retry/skip/abort
   - Apos todos, executa verificacao automaticamente

3. **Componente de Logs (Terminal visual):**
   - Fundo escuro estilo terminal
   - Scroll automatico para o final
   - Cada log com timestamp e icone de status (check verde, x vermelho)
   - Filtravel por tipo (sucesso/erro/info)

4. **Componente de Verificacao:**
   - Tabela comparativa: Origem vs Destino
   - Badge verde se contagens iguais, amarelo se diferente
   - Mostra: tabelas, funcoes, policies, triggers, buckets

5. **Timeline visual:**
   - Linha vertical conectando os passos
   - Passo ativo com animacao pulse
   - Passos concluidos com check verde e tempo
   - Passos pendentes em cinza

6. **Header com controles globais:**
   - Botao "Executar Tudo" (destaque primario)
   - Botao "Verificar Migracao" (apos conclusao)
   - Timer mostrando tempo total decorrido
   - Barra de progresso animada

#### Arquivo: `src/pages/dashboard/AdminPanel.tsx`
Nenhuma mudanca necessaria (ja importa MigrationWizard).

---

### Arquivos Modificados
- `supabase/functions/migrate-to-external/index.ts` - adicionar `verify-migration` + enriquecer retornos com `details[]`
- `src/components/dashboard/MigrationWizard.tsx` - reescrita completa da UI

### Fluxo do Usuario
1. Insere credenciais e testa conexao (igual ao atual)
2. Clica "Executar Tudo"
3. Assiste os passos sendo executados automaticamente com logs em tempo real
4. Se algo falha, escolhe retry ou pular
5. Apos conclusao, ve o resumo de verificacao comparando origem vs destino
6. Exporta o relatorio se desejar

