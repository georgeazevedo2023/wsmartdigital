
## Objetivo
Corrigir o erro ao clicar em **Histórico → Reenviar → Leads**, que hoje leva para uma rota inexistente (**/dashboard/leads-broadcast**) e cai em **404**. Garantir também compatibilidade com links antigos/bookmarks.

---

## Diagnóstico (o que está acontecendo)
- O app tem a rota de Leads configurada como: **/dashboard/broadcast/leads** (confirmado no roteamento).
- Porém, no fluxo de “Reenviar”, o código navega para **/dashboard/leads-broadcast**.
- Resultado: abre a página **NotFound (404)**, exatamente como aparece no console:
  - “User attempted to access non-existent route: /dashboard/leads-broadcast”.

---

## Mudanças planejadas (mínimas e seguras)

### 1) Corrigir a navegação do “Reenviar → Leads”
**Arquivo:** `src/pages/dashboard/BroadcastHistoryPage.tsx`

- Trocar:
  - `navigate('/dashboard/leads-broadcast')`
- Por:
  - `navigate('/dashboard/broadcast/leads')`

Isso resolve o erro imediatamente no fluxo.

---

### 2) Adicionar rota “alias” (redirect) para não quebrar links antigos
**Arquivo:** `src/App.tsx`

- Dentro das rotas de `/dashboard`, adicionar uma rota:
  - `path="leads-broadcast"` → `<Navigate to="/dashboard/broadcast/leads" replace />`

Com isso, mesmo que alguém tenha salvo/compartilhado **/dashboard/leads-broadcast**, a aplicação redireciona corretamente.

---

## Como validar (checklist de teste)
1. Acesse **/dashboard/broadcast/history**.
2. Clique em **Reenviar** em um envio qualquer.
3. Selecione **Leads** e confirme.
4. Verifique que:
   - Não aparece mais 404.
   - A URL vira **/dashboard/broadcast/leads**.
   - O banner de “Reenviando mensagem” aparece no Leads Broadcaster.
   - O formulário vem preenchido com `content/media/carousel` (quando aplicável).

Teste extra:
- Acesse manualmente **/dashboard/leads-broadcast** no navegador e confirme que redireciona para **/dashboard/broadcast/leads**.

---

## Risco / Impacto
- Baixíssimo: altera apenas uma URL de navegação e adiciona um redirect de compatibilidade.
- Não afeta banco, autenticação, nem envio de mensagens.

---

## Arquivos que serão alterados
- `src/pages/dashboard/BroadcastHistoryPage.tsx` (ajuste do navigate)
- `src/App.tsx` (rota de redirect/alias)
