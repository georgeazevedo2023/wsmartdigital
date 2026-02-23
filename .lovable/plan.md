

## Otimizacao de Custos do Servidor

### Diagnostico Atual

| Recurso | Tamanho | Causa |
|---------|---------|-------|
| `cron.job_run_details` | **49 MB** (42.456 registros) | Logs de execucao do cron a cada 1 minuto |
| `net._http_response` | **47 MB** (366 registros) | Respostas HTTP cacheadas pelo pg_net |
| Dados reais do app | ~1.5 MB | Conversas, contatos, kanban, etc. |

**96 MB de 111 MB sao lixo de sistema** - representam 87% do uso do banco.

### Cron Jobs Atuais (5 jobs)

| Job | Frequencia | Impacto |
|-----|-----------|---------|
| `process-scheduled-messages` | **A cada 1 minuto** | ~43.200 execucoes/mes |
| `auto-summarize-inactive` | A cada 1 hora | 720 execucoes/mes |
| `send-shift-reports-hourly` | A cada 1 hora | 720 execucoes/mes |
| `cleanup-old-media` | 1x/dia as 03h | 30 execucoes/mes |
| `cleanup-expired-summaries` | 1x/dia as 03h | 30 execucoes/mes |

### Plano de Otimizacao (3 acoes)

**Acao 1 - Reduzir frequencia do cron principal**
- Mudar `process-scheduled-messages` de **1 minuto para 5 minutos**
- Reducao: de 43.200 para 8.640 execucoes/mes (80% menos)
- Impacto no usuario: mensagens agendadas podem atrasar ate 5 min (aceitavel para agendamentos)

**Acao 2 - Criar cron de limpeza automatica dos logs**
- Novo cron job diario (as 04h) que:
  - Deleta registros de `cron.job_run_details` com mais de 7 dias
  - Deleta registros de `net._http_response` com mais de 7 dias
- Isso mantem essas tabelas pequenas permanentemente

**Acao 3 - Limpeza imediata unica**
- Executar DELETE nas duas tabelas agora para liberar os 96 MB
- Rodar VACUUM para devolver o espaco ao banco

### Resultado Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Tamanho do banco | ~111 MB | ~15 MB |
| Execucoes edge functions/mes | ~44.670 | ~10.110 |
| Custo estimado | ~$15/mes | ~$3-5/mes |

### Detalhes Tecnicos

**Passo 1 - SQL para alterar cron de 1 min para 5 min:**
```sql
SELECT cron.unschedule('process-scheduled-messages');
SELECT cron.schedule(
  'process-scheduled-messages',
  '*/5 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

**Passo 2 - SQL para criar cron de limpeza automatica:**
```sql
SELECT cron.schedule(
  'cleanup-system-logs',
  '0 4 * * *',
  $$
    DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days';
    DELETE FROM net._http_response WHERE created < now() - interval '7 days';
  $$
);
```

**Passo 3 - SQL para limpeza imediata:**
```sql
DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';
DELETE FROM net._http_response WHERE created < now() - interval '1 day';
```

Nenhum arquivo de codigo precisa ser alterado. Todas as mudancas sao via SQL no banco de dados.

