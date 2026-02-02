

# Plano: Adicionar Upload de Arquivo CSV

## Visao Geral
Adicionar uma nova aba "Arquivo CSV" ao componente `LeadImporter` para permitir que usuarios importem contatos diretamente de arquivos `.csv`.

## Mudancas no Componente

### Arquivo: `src/components/broadcast/LeadImporter.tsx`

**1. Adicionar nova aba no TabsList**

Alterar de 3 para 4 colunas e adicionar a aba "Arquivo CSV":

```tsx
<TabsList className="grid w-full grid-cols-4">
  <TabsTrigger value="paste">...</TabsTrigger>
  <TabsTrigger value="csv">
    <FileSpreadsheet className="w-4 h-4" />
    Arquivo CSV
  </TabsTrigger>
  <TabsTrigger value="groups">...</TabsTrigger>
  <TabsTrigger value="manual">...</TabsTrigger>
</TabsList>
```

**2. Adicionar estado para upload CSV**

```tsx
const [csvFile, setCsvFile] = useState<File | null>(null);
const [isProcessingCsv, setIsProcessingCsv] = useState(false);
```

**3. Criar funcao de processamento CSV**

```tsx
const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setCsvFile(file);
};

const processCsvFile = async () => {
  if (!csvFile) return;
  setIsProcessingCsv(true);

  const text = await csvFile.text();
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  
  // Detectar delimitador (virgula, ponto-e-virgula, tab)
  const delimiter = detectDelimiter(lines[0]);
  
  // Pular cabecalho se existir
  const hasHeader = detectHeader(lines[0], delimiter);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  
  // Processar cada linha
  const leads = parseCSVLines(dataLines, delimiter);
  
  onLeadsImported(leads);
  setCsvFile(null);
  setIsProcessingCsv(false);
};
```

**4. Adicionar TabsContent para CSV**

```tsx
<TabsContent value="csv" className="space-y-4">
  <div>
    <Label>Arquivo CSV</Label>
    <p className="text-xs text-muted-foreground mb-2">
      O arquivo deve conter uma coluna com numeros de telefone.
      Opcionalmente pode ter uma coluna com nomes.
    </p>
  </div>
  
  <div className="border-2 border-dashed rounded-lg p-6 text-center">
    <input
      type="file"
      accept=".csv"
      onChange={handleCsvUpload}
      className="hidden"
      id="csv-input"
    />
    <label htmlFor="csv-input" className="cursor-pointer">
      <Upload className="w-8 h-8 mx-auto mb-2" />
      <p>Clique para selecionar</p>
      <p className="text-xs text-muted-foreground">ou arraste o arquivo</p>
    </label>
  </div>
  
  {csvFile && (
    <div className="flex items-center justify-between">
      <span>{csvFile.name}</span>
      <Button onClick={processCsvFile} disabled={isProcessingCsv}>
        {isProcessingCsv ? <Loader2 /> : <FileSpreadsheet />}
        Importar
      </Button>
    </div>
  )}
</TabsContent>
```

## Logica de Parsing CSV

### Deteccao Automatica de Delimitador

O sistema detectara automaticamente o delimitador usado:
- Virgula (`,`)
- Ponto-e-virgula (`;`)
- Tab (`\t`)

### Deteccao de Cabecalho

Verifica se a primeira linha contem palavras como "nome", "telefone", "phone", "name", "numero" para identificar cabecalho.

### Mapeamento de Colunas

O sistema buscara automaticamente:
1. **Coluna de telefone**: Busca por numeros com 10+ digitos
2. **Coluna de nome**: Primeira coluna que nao e telefone

### Formatos de CSV Suportados

| Formato | Exemplo |
|---------|---------|
| Apenas numeros | `11999998888` |
| Nome e telefone | `Joao Silva,11999998888` |
| Telefone e nome | `11999998888,Joao Silva` |
| Com cabecalho | `nome;telefone\nJoao;11999998888` |

## Novo Icone

Adicionar import do icone `FileSpreadsheet` e `Upload` do lucide-react:

```tsx
import { FileSpreadsheet, Upload } from 'lucide-react';
```

## Resumo das Mudancas

1. Adicionar import de icones `FileSpreadsheet` e `Upload`
2. Adicionar estados `csvFile` e `isProcessingCsv`
3. Alterar TabsList de 3 para 4 colunas
4. Adicionar nova TabsTrigger para "csv"
5. Adicionar nova TabsContent com:
   - Input de arquivo (drag & drop visual)
   - Preview do arquivo selecionado
   - Botao de importacao
6. Implementar funcoes auxiliares:
   - `detectDelimiter()` - detecta `,` `;` ou `\t`
   - `detectHeader()` - verifica se primeira linha e cabecalho
   - `parseCsvLine()` - processa linha CSV respeitando aspas
   - `processCsvFile()` - orquestra o processamento

