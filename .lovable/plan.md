

# Plano: Verificar Numeros no WhatsApp

## Visao Geral
Adicionar funcionalidade para verificar se os numeros importados estao registrados no WhatsApp utilizando o endpoint `/chat/check` da UAZAPI. Isso permitira filtrar contatos invalidos antes do envio.

## Estrutura da API UAZAPI

Baseado na documentacao e padroes similares, o endpoint `/chat/check` funciona assim:

```text
POST /chat/check
Headers: { token: instanceToken }
Body: { phone: ["5511999998888", "5521988887777", ...] }

Response:
{
  "Users": [
    {
      "IsInWhatsapp": true,
      "JID": "5511999998888@s.whatsapp.net",
      "Query": "5511999998888",
      "VerifiedName": "Nome Comercial"
    },
    {
      "IsInWhatsapp": false,
      "JID": "5521988887777@s.whatsapp.net",
      "Query": "5521988887777",
      "VerifiedName": ""
    }
  ]
}
```

---

## Mudancas Necessarias

### 1. Edge Function: uazapi-proxy/index.ts

Adicionar novo case `check-numbers`:

```typescript
case 'check-numbers': {
  if (!instanceToken || !body.phones || !Array.isArray(body.phones)) {
    return new Response(
      JSON.stringify({ error: 'Instance token and phones array required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
  
  console.log('Checking', body.phones.length, 'numbers')
  
  const checkResponse = await fetch(`${uazapiUrl}/chat/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'token': instanceToken,
    },
    body: JSON.stringify({ phone: body.phones }),
  })
  
  const checkData = await checkResponse.json()
  
  // Normalizar resposta
  const users = checkData.Users || checkData.users || checkData.data || []
  
  return new Response(
    JSON.stringify({ users }),
    { status: checkResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
```

### 2. Interface Lead: LeadsBroadcaster.tsx

Estender a interface para incluir status de verificacao:

```typescript
export interface Lead {
  id: string;
  phone: string;
  name?: string;
  jid: string;
  source: 'manual' | 'paste' | 'group';
  groupName?: string;
  // Novos campos de verificacao
  isVerified?: boolean;        // true = verificado no WhatsApp
  verifiedName?: string;       // Nome comercial (se disponivel)
  verificationStatus?: 'pending' | 'valid' | 'invalid' | 'error';
}
```

### 3. Componente LeadsBroadcaster.tsx

Adicionar funcao de verificacao e estado:

```typescript
const [isVerifying, setIsVerifying] = useState(false);
const [verificationProgress, setVerificationProgress] = useState(0);

const handleVerifyNumbers = async () => {
  if (!selectedInstance || leads.length === 0) return;
  
  setIsVerifying(true);
  setVerificationProgress(0);
  
  // Extrair numeros (sem @s.whatsapp.net)
  const phones = leads.map(l => l.jid.replace('@s.whatsapp.net', ''));
  
  // Verificar em lotes de 50 para evitar timeout
  const BATCH_SIZE = 50;
  const results = new Map<string, { isValid: boolean; verifiedName?: string }>();
  
  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const batch = phones.slice(i, i + BATCH_SIZE);
    
    const response = await supabase.functions.invoke('uazapi-proxy', {
      body: {
        action: 'check-numbers',
        token: selectedInstance.token,
        phones: batch,
      },
    });
    
    if (response.data?.users) {
      response.data.users.forEach((u: any) => {
        results.set(u.Query || u.query, {
          isValid: u.IsInWhatsapp || u.isInWhatsapp || false,
          verifiedName: u.VerifiedName || u.verifiedName || '',
        });
      });
    }
    
    setVerificationProgress(Math.min(100, ((i + batch.length) / phones.length) * 100));
  }
  
  // Atualizar leads com status
  setLeads(prevLeads => prevLeads.map(lead => {
    const phone = lead.jid.replace('@s.whatsapp.net', '');
    const result = results.get(phone);
    return {
      ...lead,
      verificationStatus: result ? (result.isValid ? 'valid' : 'invalid') : 'error',
      isVerified: result?.isValid ?? false,
      verifiedName: result?.verifiedName,
    };
  }));
  
  setIsVerifying(false);
};
```

Adicionar botao na UI apos importar contatos:

```tsx
<div className="flex items-center gap-2">
  <Button 
    variant="outline" 
    size="sm" 
    onClick={handleVerifyNumbers}
    disabled={isVerifying || leads.length === 0}
  >
    {isVerifying ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Verificando... {Math.round(verificationProgress)}%
      </>
    ) : (
      <>
        <ShieldCheck className="w-4 h-4 mr-2" />
        Verificar Numeros
      </>
    )}
  </Button>
</div>
```

### 4. Componente LeadList.tsx

Exibir status de verificacao ao lado de cada contato:

```tsx
const getVerificationBadge = (lead: Lead) => {
  switch (lead.verificationStatus) {
    case 'valid':
      return (
        <Badge variant="default" className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          WhatsApp
        </Badge>
      );
    case 'invalid':
      return (
        <Badge variant="destructive" className="text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Invalido
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="text-xs text-yellow-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          Erro
        </Badge>
      );
    default:
      return null; // Nao verificado ainda
  }
};

// Na renderizacao do lead:
<div className="flex items-center gap-1.5">
  {getVerificationBadge(lead)}
  {getSourceBadge(lead.source, lead.groupName)}
</div>
```

### 5. Filtros Adicionais

Adicionar opcao para filtrar por status de verificacao:

```tsx
// Novo estado
const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid' | 'pending'>('all');

// Filtro atualizado
const filteredLeads = useMemo(() => {
  let result = leads;
  
  // Filtro de busca
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    result = result.filter(lead =>
      lead.phone.includes(search) ||
      lead.name?.toLowerCase().includes(searchLower)
    );
  }
  
  // Filtro de status
  if (statusFilter !== 'all') {
    if (statusFilter === 'pending') {
      result = result.filter(l => !l.verificationStatus);
    } else {
      result = result.filter(l => l.verificationStatus === statusFilter);
    }
  }
  
  return result;
}, [leads, search, statusFilter]);
```

UI de filtro:

```tsx
<Select value={statusFilter} onValueChange={setStatusFilter}>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="valid">Validos</SelectItem>
    <SelectItem value="invalid">Invalidos</SelectItem>
    <SelectItem value="pending">Nao verificados</SelectItem>
  </SelectContent>
</Select>
```

---

## Resumo dos Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/uazapi-proxy/index.ts` | Adicionar case `check-numbers` |
| `src/pages/dashboard/LeadsBroadcaster.tsx` | Estender interface Lead, adicionar funcao de verificacao |
| `src/components/broadcast/LeadList.tsx` | Exibir badges de verificacao, adicionar filtro por status |

---

## Fluxo do Usuario

```text
1. Importar contatos (CSV, colar, grupos, manual)
           |
           v
2. Ver lista de contatos importados
           |
           v
3. Clicar em "Verificar Numeros"
           |
           v
4. Aguardar progresso (lotes de 50)
           |
           v
5. Ver badges verde (valido) ou vermelho (invalido)
           |
           v
6. Filtrar apenas validos se desejar
           |
           v
7. Continuar para envio de mensagem
```

---

## Consideracoes Tecnicas

1. **Limite de Lote**: Verificar em lotes de 50 numeros para evitar timeouts e limites da API

2. **Cache**: Os resultados sao armazenados no estado local. Se o usuario reimportar, precisara verificar novamente

3. **Custo**: A verificacao pode ter custo na UAZAPI dependendo do plano. Exibir aviso antes de verificar grandes listas

4. **Selecao Inteligente**: Apos verificacao, auto-desmarcar contatos invalidos ou oferecer botao "Selecionar apenas validos"

