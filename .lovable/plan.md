
## Diagnóstico (por que ainda dá erro)
- O backend (função `uazapi-proxy`) já está chamando corretamente `POST /instance/connect` com o header `token` e body `{}`.
- Porém a resposta real da UAZAPI (confirmado por teste direto) não vem como `{"qrcode": "..."}` no nível raiz. Ela vem assim:
  - `data.instance.qrcode` (e também `data.instance.status: "connecting"`)
- Hoje o frontend só procura `data.qrcode` (e às vezes `data.base64`), então ele conclui “não foi possível gerar QR Code” mesmo quando o QR existe.

## Objetivo
1) Corrigir o parse do QR Code (ler também `instance.qrcode`) em:
- Tela de detalhes da instância (modal “Conectar …” que está mostrando o erro).
- Lista de instâncias (botão “Conectar” do card).

2) Implementar o fluxo completo recomendado:
- Renderização segura do base64 (prefixo `data:image/png;base64,` quando necessário).
- Polling a cada 5s em `/instance/status` enquanto o modal estiver aberto, parando quando conectar.

---

## Mudanças no backend (função “gateway”)
### A) Adicionar ação `status` no `uazapi-proxy`
**Arquivo:** `supabase/functions/uazapi-proxy/index.ts`

- Criar um novo `case 'status'` que:
  - Valida `instanceToken`
  - Faz `GET ${uazapiUrl}/instance/status` com header `token: instanceToken`
  - Retorna o JSON para o frontend

Motivo: o frontend não deve chamar a API externa direto; centralizamos tudo pelo gateway.

### B) (Opcional, para debug rápido) Logar parte do corpo no connect quando não vier QR
- Se `response.status` não for 200 ou se não vier `instance.qrcode`, logar os primeiros ~300 chars do `rawText` para facilitar diagnóstico futuro.

---

## Mudanças no frontend (correção do QR + polling)
### 1) Normalização do QR Code (Base64 -> src de imagem)
Criar uma função utilitária (local no componente ou helper) `normalizeQrSrc(qr: string)`:
- Se começar com `data:image`, retorna como está
- Senão retorna `data:image/png;base64,${qr}`

Aplicar essa normalização antes de setar no estado e antes de renderizar no `<img src=...>`.

### 2) Corrigir parse da resposta do connect (onde está quebrando)
#### A) Detalhes da instância
**Arquivo:** `src/components/instance/InstanceOverview.tsx`

Atualizar o `handleConnect` para extrair QR nesta ordem:
- `data.instance?.qrcode`
- `data.qrcode`
- `data.base64`

E também detectar “já conectou”:
- `data.instance?.status === 'connected'` ou `data.status?.connected === true` ou `data.loggedIn === true`

#### B) Lista de instâncias
**Arquivo:** `src/pages/dashboard/Instances.tsx`

Atualizar o `handleConnect` para usar a mesma lógica de extração:
- `result.instance?.qrcode` etc.

> Observação importante: hoje `currentQrCode` é único e é passado para todos os cards. Vou ajustar para guardar também `qrInstanceId` (ou guardar `selectedInstance`) para garantir que o QR apareça apenas no card/modal correto.

### 3) Implementar Polling a cada 5 segundos enquanto o modal estiver aberto
#### A) Detalhes da instância (`InstanceOverview`)
- Ao exibir o QR com sucesso, iniciar um `setInterval` a cada 5000ms:
  - Chamar o gateway com `{ action: 'status', token: instance.token }`
  - Se vier `connected` / `loggedIn`, então:
    - Parar o interval
    - Mostrar toast “Conectado com sucesso”
    - Fechar modal
    - Chamar `onUpdate()` para recarregar dados

- Garantir cleanup:
  - Quando o modal fechar, limpar o interval
  - No unmount do componente, limpar também

#### B) Lista de instâncias (`Instances`)
Existem 2 abordagens; vou seguir a mais robusta:

**Abordagem recomendada:** centralizar o modal de QR na página `Instances.tsx` (em vez de cada `InstanceCard` ter seu próprio `Dialog`)
- Guardar em estado:
  - `qrDialogOpen`
  - `selectedInstance`
  - `qrCode`
  - `isLoadingQr`
- O `InstanceCard` apenas chama `onConnect(instance)` e o modal abre no pai.
- O polling fica todo no `Instances.tsx` e atualiza/fecha o modal do pai ao conectar.

Motivo: evita inconsistência de `currentQrCode` único sendo repassado para vários cards.

---

## Ajustes visuais (rápidos, mas úteis)
- No modal de QR:
  - Exibir um texto pequeno “Aguardando leitura do QR… (verificando status a cada 5s)”
  - Botão “Gerar novo QR” (reexecuta connect)
  - Botão “Fechar” (para o polling)

---

## Validação (como vamos confirmar que ficou correto)
1) Teste de backend:
- Chamar o gateway `connect` e confirmar que retorna `instance.qrcode`.
- Chamar o gateway `status` e confirmar que retorna `status` coerente.

2) Teste de UI:
- Abrir a instância “Teste de QR Code”
- Clicar em “Conectar via QR Code”
- QR deve aparecer (sem mensagem de erro)
- Após escanear, modal fecha automaticamente e status muda para conectado (sem esperar 30s)

---

## Arquivos envolvidos
- `supabase/functions/uazapi-proxy/index.ts` (adicionar action `status` + logs opcionais)
- `src/components/instance/InstanceOverview.tsx` (parse correto + normalize + polling 5s + cleanup)
- `src/pages/dashboard/Instances.tsx` (parse correto + modal central + polling 5s + cleanup)
- `src/components/dashboard/InstanceCard.tsx` (se centralizarmos o modal no pai, simplificar/remover o Dialog interno do card)

---

## Riscos e mitigação
- “connection attempt canceled by API” pode acontecer se um connect anterior ficou pendente.
  - Mitigação: ao clicar “Gerar novo QR”, refaz o connect e reinicia polling; também exibir lastDisconnectReason para diagnóstico.
- Interval duplicado (vazamento):
  - Mitigação: sempre guardar `intervalId` em `useRef` e limpar no fechamento/unmount.
