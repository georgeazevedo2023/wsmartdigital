import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardPaste, Loader2 } from 'lucide-react';

interface ImportPasteTabProps {
  pasteText: string;
  setPasteText: (v: string) => void;
  isParsing: boolean;
  onImport: () => void;
}

const ImportPasteTab = ({ pasteText, setPasteText, isParsing, onImport }: ImportPasteTabProps) => (
  <div className="space-y-4">
    <div>
      <Label>Cole a lista de números</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Um número por linha, ou separados por vírgula. Formato: "Nome - Número" ou apenas o número.
      </p>
      <Textarea
        placeholder={`Exemplos:\n11999998888\n+55 21 98765-4321\nJoão Silva - 11988887777\nMaria, 21999996666`}
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        rows={8}
        className="font-mono text-sm"
      />
    </div>
    <Button onClick={onImport} disabled={isParsing || !pasteText.trim()}>
      {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardPaste className="w-4 h-4 mr-2" />}
      Importar Contatos
    </Button>
  </div>
);

export default ImportPasteTab;
