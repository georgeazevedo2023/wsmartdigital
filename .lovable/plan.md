

# Armazenar Imagens de Carrossel em Alta Resolucao

## Problema Identificado

Quando o usuario reenvia um carrossel do historico, as imagens chegam com baixa resolucao (200px) porque o sistema atualmente comprime os arquivos locais para "thumbnails" antes de salvar no banco de dados.

**Codigo atual:**
```typescript
const compressImageToThumbnail = (file: File, maxWidth = 200, quality = 0.6)
```

## Solucao Proposta

Usar o **Storage** (Lovable Cloud) para armazenar as imagens em alta resolucao e salvar apenas a URL no banco de dados.

```text
Fluxo Atual (problematico):
Arquivo Local -> Compressao 200px -> Base64 -> JSON no banco

Fluxo Novo:
Arquivo Local -> Upload Storage (alta res) -> URL publica -> JSON no banco
```

---

## Arquitetura da Solucao

1. Criar um bucket de storage para imagens de carrossel
2. No momento do envio, fazer upload das imagens para o storage
3. Salvar a URL publica no campo `carousel_data`
4. No reenvio, usar a URL diretamente (ja em alta resolucao)

---

## Alteracoes Detalhadas

### 1. Criar Bucket de Storage (migration)

Criar um bucket publico para armazenar imagens de carrossel:

```sql
-- Criar bucket para imagens de carrossel
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true);

-- Politica para usuarios autenticados fazerem upload
CREATE POLICY "Users can upload carousel images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'carousel-images');

-- Politica para leitura publica
CREATE POLICY "Public can read carousel images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'carousel-images');
```

### 2. Criar funcao de upload no BroadcastMessageForm.tsx

Adicionar funcao para fazer upload de imagens para o Storage:

```typescript
const uploadCarouselImage = async (file: File): Promise<string> => {
  const session = await supabase.auth.getSession();
  if (!session.data.session) throw new Error('Nao autenticado');

  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${session.data.session.user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('carousel-images')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('carousel-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
```

### 3. Modificar saveBroadcastLog

Atualizar para fazer upload das imagens em vez de comprimir:

**Antes:**
```typescript
if (card.imageFile) {
  imageForStorage = await compressImageToThumbnail(card.imageFile);
}
```

**Depois:**
```typescript
if (card.imageFile) {
  // Upload para storage em alta resolucao
  imageForStorage = await uploadCarouselImage(card.imageFile);
} else if (card.image && card.image.startsWith('data:')) {
  // Se for base64, converter para blob e fazer upload
  const blob = await fetch(card.image).then(r => r.blob());
  const file = new File([blob], `card-${idx}.jpg`, { type: 'image/jpeg' });
  imageForStorage = await uploadCarouselImage(file);
}
// Se ja for URL externa, manter como esta
```

### 4. Aplicar mesma logica no LeadMessageForm.tsx

Replicar as alteracoes para o disparador de leads.

---

## Arquivos a Modificar

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `supabase/migrations/xxx.sql` | Novo | Criar bucket de storage |
| `src/components/broadcast/BroadcastMessageForm.tsx` | Modificar | Upload para storage em vez de comprimir |
| `src/components/broadcast/LeadMessageForm.tsx` | Modificar | Mesmas alteracoes |

---

## Beneficios

1. **Imagens em alta resolucao**: Reenvios mantem qualidade original
2. **Banco de dados leve**: Apenas URLs sao armazenadas, nao dados binarios
3. **Performance**: URLs publicas sao servidas diretamente pelo CDN
4. **Escalabilidade**: Storage e otimizado para arquivos grandes

---

## Detalhes Tecnicos

### Estrutura do Storage

```text
carousel-images/
  ├── {user_id}/
  │   ├── abc123.jpg
  │   ├── def456.png
  │   └── ...
```

### URLs Geradas

Exemplo de URL publica:
```
https://tjuokxdkimrtyqsbzskj.supabase.co/storage/v1/object/public/carousel-images/{user_id}/{filename}
```

### Compatibilidade

- URLs externas (ex: https://...) continuam funcionando normalmente
- Historico existente com thumbnails continuara funcionando (fallback)
- Novos envios usarao imagens em alta resolucao

---

## Consideracoes de Seguranca

1. Bucket publico: necessario para que o WhatsApp consiga acessar as imagens
2. Path por usuario: organiza arquivos e facilita limpeza futura
3. Politica de insert: apenas usuarios autenticados podem fazer upload

