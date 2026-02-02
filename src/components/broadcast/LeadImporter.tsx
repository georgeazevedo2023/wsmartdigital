import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardPaste, Users, Plus, Search, Loader2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { Instance } from './InstanceSelector';
import type { Lead } from '@/pages/dashboard/LeadsBroadcaster';

interface LeadImporterProps {
  instance: Instance;
  onLeadsImported: (leads: Lead[]) => void;
}

interface GroupData {
  id: string;
  name: string;
  jid: string;
  size: number;
  participants: Array<{
    jid: string;
    pushName?: string;
    phoneNumber?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
  }>;
}

const LeadImporter = ({ instance, onLeadsImported }: LeadImporterProps) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'csv' | 'groups' | 'manual'>('paste');
  
  // Paste tab state
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  
  // CSV tab state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Manual tab state
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');
  
  // Groups tab state
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Parse phone number to JID format
  const parsePhoneToJid = (phone: string): string | null => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Minimum 10 digits (DDD + 8 digits) or more
    if (cleaned.length < 10) return null;
    
    // If doesn't start with country code, add Brazil (55)
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }
    
    return `${cleaned}@s.whatsapp.net`;
  };

  // Format phone for display
  const formatPhoneDisplay = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    
    // Format: DDI DDD NUMBER (e.g., 55 11 999999999)
    if (cleaned.length >= 12) {
      const ddi = cleaned.slice(0, 2);
      const ddd = cleaned.slice(2, 4);
      const number = cleaned.slice(4);
      return `${ddi} ${ddd} ${number}`;
    }
    
    return cleaned;
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      toast.error('Cole os números para importar');
      return;
    }

    setIsParsing(true);

    // Split by newlines, commas, semicolons, or tabs
    const lines = pasteText.split(/[\n,;\t]+/).map(l => l.trim()).filter(Boolean);
    
    const leads: Lead[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      // Try to extract name and phone (format: "Name - Phone" or just phone)
      let name: string | undefined;
      let phone: string;

      if (line.includes('-')) {
        const parts = line.split('-').map(p => p.trim());
        if (parts.length >= 2) {
          // Check which part is the phone number
          const firstIsPhone = /\d{8,}/.test(parts[0].replace(/\D/g, ''));
          if (firstIsPhone) {
            phone = parts[0];
            name = parts.slice(1).join('-');
          } else {
            name = parts[0];
            phone = parts.slice(1).join('-');
          }
        } else {
          phone = line;
        }
      } else {
        phone = line;
      }

      const jid = parsePhoneToJid(phone);
      if (jid) {
        leads.push({
          id: crypto.randomUUID(),
          phone: formatPhoneDisplay(phone),
          name: name || undefined,
          jid,
          source: 'paste',
        });
      } else {
        errors.push(`Linha ${index + 1}: "${line}" - número inválido`);
      }
    });

    setIsParsing(false);

    if (leads.length > 0) {
      onLeadsImported(leads);
      setPasteText('');
      toast.success(`${leads.length} contato${leads.length !== 1 ? 's' : ''} importado${leads.length !== 1 ? 's' : ''}`);
    }

    if (errors.length > 0 && errors.length <= 3) {
      toast.error(errors.join('\n'));
    } else if (errors.length > 3) {
      toast.error(`${errors.length} números inválidos não foram importados`);
    }
  };

  // CSV Helper functions
  const detectDelimiter = (line: string): string => {
    const semicolonCount = (line.match(/;/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const tabCount = (line.match(/\t/g) || []).length;
    
    if (tabCount > 0 && tabCount >= semicolonCount && tabCount >= commaCount) return '\t';
    if (semicolonCount > commaCount) return ';';
    return ',';
  };

  const detectHeader = (line: string, delimiter: string): boolean => {
    const headerKeywords = ['nome', 'name', 'telefone', 'phone', 'numero', 'número', 'celular', 'whatsapp', 'contato'];
    const lowerLine = line.toLowerCase();
    return headerKeywords.some(keyword => lowerLine.includes(keyword));
  };

  const parseCsvLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const findPhoneAndNameColumns = (values: string[]): { phoneIndex: number; nameIndex: number } => {
    let phoneIndex = -1;
    let nameIndex = -1;
    
    values.forEach((value, index) => {
      const cleaned = value.replace(/\D/g, '');
      // Phone: has 10+ digits
      if (cleaned.length >= 10 && phoneIndex === -1) {
        phoneIndex = index;
      }
    });
    
    // Name: first non-phone column with text
    values.forEach((value, index) => {
      if (index !== phoneIndex && value.length > 0 && !/^\d+$/.test(value.replace(/\D/g, ''))) {
        if (nameIndex === -1) nameIndex = index;
      }
    });
    
    return { phoneIndex, nameIndex };
  };

  const isValidFileType = (fileName: string): boolean => {
    const ext = fileName.toLowerCase();
    return ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFileType(file.name)) {
      setCsvFile(file);
    } else if (file) {
      toast.error('Por favor, selecione um arquivo .csv, .xlsx ou .xls');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && isValidFileType(file.name)) {
      setCsvFile(file);
    } else if (file) {
      toast.error('Por favor, arraste um arquivo .csv, .xlsx ou .xls');
    }
  };

  const processExcelFile = async (file: File): Promise<string[][]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
    return data.filter(row => row.some(cell => cell?.toString().trim()));
  };

  const processFile = async () => {
    if (!csvFile) return;
    
    setIsProcessingCsv(true);
    
    try {
      const isExcel = csvFile.name.toLowerCase().endsWith('.xlsx') || csvFile.name.toLowerCase().endsWith('.xls');
      let dataRows: string[][];
      
      if (isExcel) {
        // Process Excel file
        dataRows = await processExcelFile(csvFile);
      } else {
        // Process CSV file
        const text = await csvFile.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length === 0) {
          toast.error('Arquivo vazio');
          setIsProcessingCsv(false);
          return;
        }
        
        const delimiter = detectDelimiter(lines[0]);
        dataRows = lines.map(line => parseCsvLine(line, delimiter));
      }
      
      if (dataRows.length === 0) {
        toast.error('Arquivo vazio');
        setIsProcessingCsv(false);
        return;
      }
      
      // Check for header
      const firstRowStr = dataRows[0].map(v => v?.toString().toLowerCase() || '').join(' ');
      const hasHeader = detectHeader(firstRowStr, ',');
      const dataLines = hasHeader ? dataRows.slice(1) : dataRows;
      
      if (dataLines.length === 0) {
        toast.error('Nenhum dado encontrado no arquivo');
        setIsProcessingCsv(false);
        return;
      }
      
      // Detect column positions from first data line
      const firstLineValues = dataLines[0].map(v => v?.toString() || '');
      const { phoneIndex, nameIndex } = findPhoneAndNameColumns(firstLineValues);
      
      if (phoneIndex === -1) {
        toast.error('Não foi possível identificar a coluna de telefone');
        setIsProcessingCsv(false);
        return;
      }
      
      const leads: Lead[] = [];
      const errors: string[] = [];
      
      dataLines.forEach((row, index) => {
        const phoneValue = row[phoneIndex]?.toString() || '';
        const nameValue = nameIndex >= 0 ? row[nameIndex]?.toString() : undefined;
        
        const jid = parsePhoneToJid(phoneValue);
        if (jid) {
          leads.push({
            id: crypto.randomUUID(),
            phone: formatPhoneDisplay(phoneValue),
            name: nameValue?.trim() || undefined,
            jid,
            source: 'paste',
          });
        } else if (phoneValue.trim()) {
          errors.push(`Linha ${index + 1 + (hasHeader ? 1 : 0)}: "${phoneValue}" - número inválido`);
        }
      });
      
      const fileType = isExcel ? 'Excel' : 'CSV';
      
      if (leads.length > 0) {
        onLeadsImported(leads);
        setCsvFile(null);
        if (csvInputRef.current) csvInputRef.current.value = '';
        toast.success(`${leads.length} contato${leads.length !== 1 ? 's' : ''} importado${leads.length !== 1 ? 's' : ''} do ${fileType}`);
      } else {
        toast.error('Nenhum contato válido encontrado no arquivo');
      }
      
      if (errors.length > 0 && errors.length <= 3) {
        errors.forEach(err => toast.error(err));
      } else if (errors.length > 3) {
        toast.error(`${errors.length} números inválidos não foram importados`);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar o arquivo');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleManualAdd = () => {
    if (!manualPhone.trim()) {
      toast.error('Digite o número do contato');
      return;
    }

    const jid = parsePhoneToJid(manualPhone);
    if (!jid) {
      toast.error('Número inválido');
      return;
    }

    const lead: Lead = {
      id: crypto.randomUUID(),
      phone: formatPhoneDisplay(manualPhone),
      name: manualName.trim() || undefined,
      jid,
      source: 'manual',
    };

    onLeadsImported([lead]);
    setManualPhone('');
    setManualName('');
    toast.success('Contato adicionado');
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({
            action: 'groups',
            token: instance.token,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to fetch groups');

      const data = await response.json();
      
      // Handle different response shapes
      let groupsData: GroupData[] = [];
      if (Array.isArray(data)) {
        groupsData = data;
      } else if (data.groups && Array.isArray(data.groups)) {
        groupsData = data.groups;
      } else if (data.data && Array.isArray(data.data)) {
        groupsData = data.data;
      }

      // Map to our format
      const mappedGroups = groupsData.map((g: any) => ({
        id: g.JID || g.jid || g.id,
        name: g.Name || g.name || g.subject || 'Sem nome',
        jid: g.JID || g.jid || g.id,
        size: g.Size || g.size || g.Participants?.length || g.participants?.length || 0,
        participants: (g.Participants || g.participants || []).map((p: any) => ({
          jid: p.JID || p.jid || p.id,
          pushName: p.DisplayName || p.PushName || p.pushName || p.displayName || '',
          phoneNumber: p.PhoneNumber || p.phoneNumber || '',
          isAdmin: p.IsAdmin || p.isAdmin || false,
          isSuperAdmin: p.IsSuperAdmin || p.isSuperAdmin || false,
        })),
      }));

      setGroups(mappedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Erro ao buscar grupos');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelection = new Set(selectedGroupIds);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    setSelectedGroupIds(newSelection);
  };

  const handleExtractFromGroups = () => {
    if (selectedGroupIds.size === 0) {
      toast.error('Selecione pelo menos um grupo');
      return;
    }

    setIsExtracting(true);

    const leads: Lead[] = [];
    const seenPhones = new Set<string>();

    selectedGroupIds.forEach(groupId => {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      group.participants.forEach(participant => {
        // Skip admins and super admins
        if (participant.isAdmin || participant.isSuperAdmin) return;

        // Extract phone from JID
        const phoneMatch = participant.jid?.match(/^(\d+)@/);
        if (!phoneMatch) return;

        const phone = phoneMatch[1];
        if (seenPhones.has(phone)) return;
        seenPhones.add(phone);

        leads.push({
          id: crypto.randomUUID(),
          phone: formatPhoneDisplay(phone),
          name: participant.pushName || undefined,
          jid: participant.jid,
          source: 'group',
          groupName: group.name,
        });
      });
    });

    setIsExtracting(false);

    if (leads.length > 0) {
      onLeadsImported(leads);
      setSelectedGroupIds(new Set());
      toast.success(`${leads.length} contato${leads.length !== 1 ? 's' : ''} extraído${leads.length !== 1 ? 's' : ''} dos grupos`);
    } else {
      toast.error('Nenhum membro encontrado nos grupos selecionados');
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="paste" className="gap-2">
          <ClipboardPaste className="w-4 h-4" />
          <span className="hidden sm:inline">Colar Lista</span>
          <span className="sm:hidden">Colar</span>
        </TabsTrigger>
        <TabsTrigger value="csv" className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          <span className="hidden sm:inline">Arquivo CSV</span>
          <span className="sm:hidden">CSV</span>
        </TabsTrigger>
        <TabsTrigger value="groups" className="gap-2" onClick={() => groups.length === 0 && fetchGroups()}>
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">De Grupos</span>
          <span className="sm:hidden">Grupos</span>
        </TabsTrigger>
        <TabsTrigger value="manual" className="gap-2">
          <Plus className="w-4 h-4" />
          Manual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="paste" className="space-y-4">
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
        <Button onClick={handlePasteImport} disabled={isParsing || !pasteText.trim()}>
          {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardPaste className="w-4 h-4 mr-2" />}
          Importar Contatos
        </Button>
      </TabsContent>

      <TabsContent value="csv" className="space-y-4">
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
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => csvInputRef.current?.click()}
        >
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Clique para selecionar</p>
          <p className="text-xs text-muted-foreground mt-1">ou arraste o arquivo aqui</p>
          <p className="text-xs text-muted-foreground mt-3">Formatos: .csv, .xlsx, .xls</p>
        </div>
        
        {csvFile && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{csvFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(csvFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCsvFile(null);
                    if (csvInputRef.current) csvInputRef.current.value = '';
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button onClick={processFile} disabled={isProcessingCsv}>
                  {isProcessingCsv ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                  )}
                  Importar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="groups" className="space-y-4">
        {loadingGroups ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Clique para carregar os grupos</p>
            <Button variant="outline" className="mt-4" onClick={fetchGroups}>
              Carregar Grupos
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredGroups.map(group => {
                  const regularMembers = group.participants.filter(p => !p.isAdmin && !p.isSuperAdmin).length;
                  return (
                    <Card
                      key={group.id}
                      className={`cursor-pointer transition-all ${selectedGroupIds.has(group.id) ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => handleGroupToggle(group.id)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <Checkbox
                          checked={selectedGroupIds.has(group.id)}
                          onCheckedChange={() => handleGroupToggle(group.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {regularMembers} membro{regularMembers !== 1 ? 's' : ''} (excluindo admins)
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            {selectedGroupIds.size > 0 && (
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {selectedGroupIds.size} grupo{selectedGroupIds.size !== 1 ? 's' : ''} selecionado{selectedGroupIds.size !== 1 ? 's' : ''}
                </Badge>
                <Button onClick={handleExtractFromGroups} disabled={isExtracting}>
                  {isExtracting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                  Extrair Membros
                </Button>
              </div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="manual" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Número *</Label>
            <Input
              id="phone"
              placeholder="11999998888"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="name">Nome (opcional)</Label>
            <Input
              id="name"
              placeholder="João Silva"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleManualAdd} disabled={!manualPhone.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Contato
        </Button>
      </TabsContent>
    </Tabs>
  );
};

export default LeadImporter;
