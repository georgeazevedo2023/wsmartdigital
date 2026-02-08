
## Objetivo
Corrigir o envio de carrossel para que:
1) os botões apareçam com texto no WhatsApp (ex: “Comprar Agora”)
2) botões URL fiquem clicáveis (abram o link)
3) botões REPLY/CALL/COPY funcionem conforme a documentação da UAZAPI

## Diagnóstico (causa raiz)
A documentação oficial do endpoint **POST `/send/carousel`** (UAZAPI) define que cada botão deve ter o formato:

```json
{ "id": "...", "text": "...", "type": "REPLY|URL|COPY|CALL" }
```

E, principalmente:
- **`text`** é o texto exibido no botão
- **`id`** é o “valor” do botão:
  - REPLY: é o texto que será enviado como resposta ao chat
  - URL: **id deve ser a URL completa**
  - COPY: id é o texto a ser copiado
  - CALL: id é o número de telefone

No nosso proxy (`uazapi-proxy`) a última alteração passou a enviar botões com:
- `label` (em vez de `text`)
- `url` / `phone` (em vez de usar o `id` como a própria URL/telefone)

Isso faz a UAZAPI montar o payload interno com `display_text` vazio e/ou mapear URL incorretamente, resultando em:
- botões sem texto
- URL não clicável
- REPLY enviando um valor errado (ex.: UUID), quando deveria enviar uma resposta legível

## Solução (alto nível)
Ajustar o **mapeamento de botões no backend function `uazapi-proxy`** para seguir exatamente o schema do endpoint `/send/carousel`:

- Sempre enviar botões como: `{ id, text, type }`
- Preencher `text` a partir do que o frontend chama hoje de `label` (e também aceitar `text` para compatibilidade)
- Preencher `id` conforme o tipo:
  - URL: `id = btn.url` (ou, se `btn.id` já for uma URL, usar `btn.id`)
  - CALL: `id = btn.phone` (ou fallback para `btn.id` se vier como número)
  - COPY: `id = btn.id` (ou um campo que o frontend mandar para cópia; por enquanto aceitar `btn.id`)
  - REPLY: para evitar enviar UUID como resposta:
    - se `btn.id` parecer UUID, usar `id = textDoBotao`
    - caso contrário, manter `id = btn.id` (permite customização quando existir)

## Mudanças detalhadas (técnico)
### 1) Atualizar `processedButtons` no `send-carousel` do proxy
Arquivo: `supabase/functions/uazapi-proxy/index.ts`

**Antes (atual, quebrado para UAZAPI):**
```ts
{ id, label, type, url?, phone? }
```

**Depois (conforme docs UAZAPI):**
```ts
{ id, text, type }
```

Regras de mapeamento:
- `const buttonText = btn.text ?? btn.label ?? ''`
- `switch (btn.type)`:
  - `URL`: `id = btn.url ?? btn.id`
  - `CALL`: `id = btn.phone ?? btn.id`
  - `COPY`: `id = btn.id` (e `text = buttonText`)
  - `REPLY`: `id = isUuidLike(btn.id) ? buttonText : (btn.id ?? buttonText)`

Adicionar helper simples `isUuidLike` para detectar UUIDs (regex) e evitar que REPLY retorne UUID no chat.

### 2) Compatibilidade com dados existentes
Hoje o frontend usa `label`. Vamos manter compatibilidade:
- ler `btn.label` e/ou `btn.text` no proxy
- não exigir mudança imediata no frontend para o básico voltar a funcionar

### 3) (Opcional, mas recomendado) Pass-through de campos comuns do endpoint
A doc mostra suporte a `delay`, `readchat`, etc.
Podemos melhorar o proxy para aceitar e repassar (quando vier no body do request):
- `delay`, `readchat`, `readmessages`, `replyid`, `mentions`, `forward`, `track_source`, `track_id`

Isso não é necessário para corrigir os botões, mas aumenta compatibilidade e evita surpresas.

## Plano de implementação
1) Ajustar o mapeamento dos botões em `send-carousel` no `uazapi-proxy` para `{id, text, type}` e regras por tipo (URL/CALL/COPY/REPLY).
2) Manter fallback para `btn.label` (frontend atual) e aceitar `btn.text` (schema oficial).
3) (Opcional) Repassar campos comuns do endpoint se existirem no body.
4) Validar via logs do proxy que o payload final enviado para UAZAPI contém `buttons: [{id, text, type}]` e que:
   - URL tem `id` iniciando com `http`
   - CALL tem `id` numérico/telefone
   - REPLY tem `id` legível (não UUID)

## Testes manuais (checklist)
1) Enviar carrossel de teste para um contato com:
   - REPLY: texto “Aproveitar!”
   - URL: texto “Comprar Agora” com `https://...`
   - CALL: texto “Falar no WhatsApp” com telefone
2) Confirmar no WhatsApp:
   - botões aparecem com texto correto
   - URL abre o link ao clicar
   - REPLY envia uma mensagem legível (idealmente igual ao texto do botão)
   - CALL abre a ação de ligação
3) Repetir para envio em grupo (se aplicável ao seu fluxo).
4) Verificar nos logs do proxy a estrutura do payload e a resposta da UAZAPI.

## Riscos / Observações
- Se alguém dependia de REPLY enviar UUID (muito improvável), o novo fallback vai preferir enviar o texto do botão quando detectar UUID.
- Caso a UAZAPI tenha validação estrita de “number” sem sufixo `@s.whatsapp.net`, podemos ajustar a normalização depois, mas pelos logs atuais o envio está chegando (o problema é o schema dos botões).
