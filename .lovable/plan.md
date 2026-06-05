## Diagnóstico

### 1) Erros `Failed to load resource ... pps.whatsapp.net ... 403` no console
São thumbnails da CDN do WhatsApp (`pps.whatsapp.net`) usados em **previews de templates de carrossel salvos**. Essas URLs expiram / são privadas — o WhatsApp bloqueia acesso externo com 403. **Não afeta envio**, é só ruído visual no preview.

### 2) Falha no envio (`401 Unauthorized` em `/functions/v1/uazapi-proxy`)
Olhando os logs da edge function:
```
Sending message to group: 5581993836363@s.whatsapp.net
Send response status: 401
Sending media type: image isBase64: true
Media response status: 401
```
O 401 **não vem do nosso proxy** — vem do servidor UAZAPI. Segundo a [doc](https://docs.uazapi.com) ("Autenticação"), todo endpoint `/send/*` exige o header `token: <token-da-instância>`. Quando o UAZAPI devolve 401, significa que o **token da instância salvo no banco não é mais válido** para a instância `motorac` no servidor UAZAPI (instância foi recriada/recriada o pareamento, token rotacionado, ou a instância foi removida do servidor).

O fluxo `Disparador → Leads` está enviando corretamente (`token` no header, payload correto conforme doc) — o problema é o token em si.

---

## Plano de correção

### A. Resolver o 401 do envio
1. **Resincronizar token** da instância `motorac`:
   - Usar o botão **"Sincronizar Instâncias"** (já existente em `SyncInstancesDialog`) para reler tokens do UAZAPI; OU
   - Reconectar a instância via QR Code (em `Instâncias → motorac → Conectar`).
2. **Melhorar mensagem de erro** no `useLeadMessageForm.ts`: quando a UAZAPI retornar 401, mostrar toast claro:
   > "Token da instância inválido. Reconecte a instância em Instâncias."
   em vez do genérico "Erro ao enviar".
3. **Validar token antes do disparo** no `LeadsBroadcaster`: fazer uma chamada leve a `action: 'status'` antes de iniciar o loop; se 401, abortar com instrução de reconectar (evita marcar leads como "falha" em massa).

### B. Limpar o ruído `pps.whatsapp.net 403` no console
- No `HistoryCarouselPreview` / `CarouselPreview`, adicionar `onError` nas `<img>` que troca a fonte para um placeholder local (`/placeholder.svg`) quando a URL do WhatsApp CDN falhar. Isso elimina os 403 e mostra fallback visual.

### Arquivos a editar
| Arquivo | Mudança |
|---|---|
| `src/hooks/useLeadMessageForm.ts` | Detectar 401 da UAZAPI → toast amigável; validar status antes do loop |
| `src/components/broadcast/HistoryCarouselPreview.tsx` | `onError` nas imgs com fallback |
| `src/components/broadcast/CarouselPreview.tsx` | `onError` nas imgs com fallback |

### Fora de escopo
Não vou alterar o `uazapi-proxy` — ele está correto e propagando o status da UAZAPI como manda a doc.
