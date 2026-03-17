import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Loader2, ArrowLeft, Check } from 'lucide-react';
import type { ParsedFileData } from '@/hooks/useLeadImport';

interface ImportCsvTabProps {
  csvFile: File | null;
  csvInputRef: React.RefObject<HTMLInputElement>;
  isProcessingCsv: boolean;
  isDragging: boolean;
  parsedData: ParsedFileData | null;
  phoneColumnIndex: number;
  setPhoneColumnIndex: (v: number) => void;
  nameColumnIndex: number;
  setNameColumnIndex: (v: number) => void;
  showColumnMapping: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onConfirmMapping: () => void;
  onReset: () => void;
}

const ImportCsvTab = ({
  csvFile, csvInputRef, isProcessingCsv, isDragging, parsedData,
  phoneColumnIndex, setPhoneColumnIndex, nameColumnIndex, setNameColumnIndex,
  showColumnMapping, onFileUpload, onDragOver, onDragLeave, onDrop,
  onConfirmMapping, onReset,
}: ImportCsvTabProps) => {
  if (!showColumnMapping) {
    return (
      <div className="space-y-4">
        <div>
          <Label>Arquivo CSV ou Excel</Label>
          <p className="text-xs text-muted-foreground mb-2">
            O arquivo deve conter uma coluna com números de telefone. Opcionalmente pode ter uma coluna com nomes.
          </p>
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => csvInputRef.current?.click()}
        >
          <input ref={csvInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileUpload} className="hidden" />
          {isProcessingCsv ? (
            <>
              <Loader2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground animate-spin" />
              <p className="font-medium">Processando arquivo...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">ou arraste o arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-3">Formatos: .csv, .xlsx, .xls</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!parsedData) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Badge variant="outline">
          {csvFile?.name} • {parsedData.rows.length} linha{parsedData.rows.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Coluna de Telefone *</Label>
              <Select value={phoneColumnIndex >= 0 ? phoneColumnIndex.toString() : ''} onValueChange={(v) => setPhoneColumnIndex(parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                <SelectContent>
                  {parsedData.headers.map((header, index) => (
                    <SelectItem key={index} value={index.toString()}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coluna de Nome (opcional)</Label>
              <Select value={nameColumnIndex >= 0 ? nameColumnIndex.toString() : 'none'} onValueChange={(v) => setNameColumnIndex(v === 'none' ? -1 : parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {parsedData.headers.map((header, index) => (
                    <SelectItem key={index} value={index.toString()} disabled={index === phoneColumnIndex}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Label className="mb-2 block">Preview (primeiras 5 linhas)</Label>
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="max-h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  {parsedData.headers.map((header, index) => (
                    <TableHead
                      key={index}
                      className={`whitespace-nowrap ${
                        index === phoneColumnIndex ? 'bg-primary/10 text-primary'
                          : index === nameColumnIndex ? 'bg-secondary' : ''
                      }`}
                    >
                      {header}
                      {index === phoneColumnIndex && <Badge className="ml-2 text-xs" variant="default">Tel</Badge>}
                      {index === nameColumnIndex && <Badge className="ml-2 text-xs" variant="secondary">Nome</Badge>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {parsedData.headers.map((_, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className={`whitespace-nowrap ${
                          colIndex === phoneColumnIndex ? 'bg-primary/5 font-medium'
                            : colIndex === nameColumnIndex ? 'bg-secondary/50' : ''
                        }`}
                      >
                        {row[colIndex]?.toString() || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onReset}>Cancelar</Button>
        <Button onClick={onConfirmMapping} disabled={phoneColumnIndex === -1}>
          <Check className="w-4 h-4 mr-2" />
          Importar {parsedData.rows.length} contato{parsedData.rows.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
};

export default ImportCsvTab;
