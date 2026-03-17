import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { Instance } from '@/components/broadcast/InstanceSelector';
import type { Lead } from '@/hooks/useLeadsBroadcaster';

export interface ParsedFileData {
  headers: string[];
  rows: string[][];
  hasHeader: boolean;
}

export interface GroupData {
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

// ─── Phone utilities ───

export const parsePhoneToJid = (phone: string): string | null => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) return null;
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
};

export const formatPhoneDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 12) {
    return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4)}`;
  }
  return cleaned;
};

// ─── CSV utilities ───

const detectDelimiter = (line: string): string => {
  const sc = (line.match(/;/g) || []).length;
  const co = (line.match(/,/g) || []).length;
  const ta = (line.match(/\t/g) || []).length;
  if (ta > 0 && ta >= sc && ta >= co) return '\t';
  if (sc > co) return ';';
  return ',';
};

const detectHeader = (line: string): boolean => {
  const kw = ['nome', 'name', 'telefone', 'phone', 'numero', 'número', 'celular', 'whatsapp', 'contato'];
  const lower = line.toLowerCase();
  return kw.some(k => lower.includes(k));
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === delimiter && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += c; }
  }
  result.push(current.trim());
  return result;
};

const findPhoneAndNameColumns = (values: string[]): { phoneIndex: number; nameIndex: number } => {
  let phoneIndex = -1;
  let nameIndex = -1;
  values.forEach((value, index) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 10 && phoneIndex === -1) phoneIndex = index;
  });
  values.forEach((value, index) => {
    if (index !== phoneIndex && value.length > 0 && !/^\d+$/.test(value.replace(/\D/g, ''))) {
      if (nameIndex === -1) nameIndex = index;
    }
  });
  return { phoneIndex, nameIndex };
};

const processExcelFile = async (file: File): Promise<string[][]> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(firstSheet, { header: 1, defval: '' });
  return data.filter(row => row.some(cell => cell?.toString().trim()));
};

const isValidFileType = (fileName: string): boolean => {
  const ext = fileName.toLowerCase();
  return ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
};

// ─── Hook ───

interface UseLeadImportOptions {
  instance: Instance;
  onLeadsImported: (leads: Lead[]) => void;
}

export function useLeadImport({ instance, onLeadsImported }: UseLeadImportOptions) {
  const [activeTab, setActiveTab] = useState<'paste' | 'csv' | 'groups' | 'manual'>('paste');

  // Paste
  const [pasteText, setPasteText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // CSV / Excel
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [phoneColumnIndex, setPhoneColumnIndex] = useState<number>(-1);
  const [nameColumnIndex, setNameColumnIndex] = useState<number>(-1);
  const [showColumnMapping, setShowColumnMapping] = useState(false);

  // Manual
  const [manualPhone, setManualPhone] = useState('');
  const [manualName, setManualName] = useState('');

  // Groups
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupSearch, setGroupSearch] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // ─── Paste ───

  const handlePasteImport = () => {
    if (!pasteText.trim()) { toast.error('Cole os números para importar'); return; }
    setIsParsing(true);

    const lines = pasteText.split(/[\n,;\t]+/).map(l => l.trim()).filter(Boolean);
    const leads: Lead[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      let name: string | undefined;
      let phone: string;
      if (line.includes('-')) {
        const parts = line.split('-').map(p => p.trim());
        if (parts.length >= 2) {
          const firstIsPhone = /\d{8,}/.test(parts[0].replace(/\D/g, ''));
          if (firstIsPhone) { phone = parts[0]; name = parts.slice(1).join('-'); }
          else { name = parts[0]; phone = parts.slice(1).join('-'); }
        } else { phone = line; }
      } else { phone = line; }

      const jid = parsePhoneToJid(phone);
      if (jid) {
        leads.push({ id: crypto.randomUUID(), phone: formatPhoneDisplay(phone), name, jid, source: 'paste' });
      } else {
        errors.push(`Linha ${index + 1}: "${line}" - número inválido`);
      }
    });

    setIsParsing(false);
    if (leads.length > 0) { onLeadsImported(leads); setPasteText(''); toast.success(`${leads.length} contato${leads.length !== 1 ? 's' : ''} importado${leads.length !== 1 ? 's' : ''}`); }
    if (errors.length > 0 && errors.length <= 3) toast.error(errors.join('\n'));
    else if (errors.length > 3) toast.error(`${errors.length} números inválidos não foram importados`);
  };

  // ─── CSV / Excel ───

  const parseFileForMapping = async (file: File) => {
    setIsProcessingCsv(true);
    try {
      const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
      let dataRows: string[][];
      if (isExcel) { dataRows = await processExcelFile(file); }
      else {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length === 0) { toast.error('Arquivo vazio'); setIsProcessingCsv(false); return; }
        const delimiter = detectDelimiter(lines[0]);
        dataRows = lines.map(line => parseCsvLine(line, delimiter));
      }
      if (dataRows.length === 0) { toast.error('Arquivo vazio'); setIsProcessingCsv(false); return; }

      const firstRowStr = dataRows[0].map(v => v?.toString().toLowerCase() || '').join(' ');
      const hasHeader = detectHeader(firstRowStr);
      const columnCount = Math.max(...dataRows.map(r => r.length));
      let headers: string[];
      let rows: string[][];
      if (hasHeader) {
        headers = dataRows[0].map((v, i) => v?.toString().trim() || `Coluna ${String.fromCharCode(65 + i)}`);
        rows = dataRows.slice(1);
      } else {
        headers = Array.from({ length: columnCount }, (_, i) => `Coluna ${String.fromCharCode(65 + i)}`);
        rows = dataRows;
      }
      if (rows.length === 0) { toast.error('Nenhum dado encontrado no arquivo'); setIsProcessingCsv(false); return; }

      const firstRowValues = rows[0].map(v => v?.toString() || '');
      const { phoneIndex, nameIndex } = findPhoneAndNameColumns(firstRowValues);

      setParsedData({ headers, rows, hasHeader });
      setPhoneColumnIndex(phoneIndex);
      setNameColumnIndex(nameIndex);
      setShowColumnMapping(true);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Erro ao processar o arquivo');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidFileType(file.name)) { setCsvFile(file); await parseFileForMapping(file); }
    else if (file) toast.error('Por favor, selecione um arquivo .csv, .xlsx ou .xls');
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && isValidFileType(file.name)) { setCsvFile(file); await parseFileForMapping(file); }
    else if (file) toast.error('Por favor, arraste um arquivo .csv, .xlsx ou .xls');
  };

  const handleConfirmMapping = () => {
    if (!parsedData || phoneColumnIndex === -1) { toast.error('Selecione a coluna de telefone'); return; }
    const leads: Lead[] = [];
    const errors: string[] = [];
    parsedData.rows.forEach((row, index) => {
      const phoneValue = row[phoneColumnIndex]?.toString() || '';
      const nameValue = nameColumnIndex >= 0 ? row[nameColumnIndex]?.toString() : undefined;
      const jid = parsePhoneToJid(phoneValue);
      if (jid) {
        leads.push({ id: crypto.randomUUID(), phone: formatPhoneDisplay(phoneValue), name: nameValue?.trim() || undefined, jid, source: 'paste' });
      } else if (phoneValue.trim()) {
        errors.push(`Linha ${index + 1 + (parsedData.hasHeader ? 1 : 0)}: "${phoneValue}" - número inválido`);
      }
    });
    if (leads.length > 0) { onLeadsImported(leads); resetFileState(); toast.success(`${leads.length} contato${leads.length !== 1 ? 's' : ''} importado${leads.length !== 1 ? 's' : ''}`); }
    else toast.error('Nenhum contato válido encontrado no arquivo');
    if (errors.length > 0 && errors.length <= 3) errors.forEach(err => toast.error(err));
    else if (errors.length > 3) toast.error(`${errors.length} números inválidos não foram importados`);
  };

  const resetFileState = () => {
    setCsvFile(null); setParsedData(null); setPhoneColumnIndex(-1); setNameColumnIndex(-1);
    setShowColumnMapping(false);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  // ─── Manual ───

  const handleManualAdd = () => {
    if (!manualPhone.trim()) { toast.error('Digite o número do contato'); return; }
    const jid = parsePhoneToJid(manualPhone);
    if (!jid) { toast.error('Número inválido'); return; }
    onLeadsImported([{ id: crypto.randomUUID(), phone: formatPhoneDisplay(manualPhone), name: manualName.trim() || undefined, jid, source: 'manual' }]);
    setManualPhone(''); setManualName('');
    toast.success('Contato adicionado');
  };

  // ─── Groups ───

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Not authenticated');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-proxy`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.data.session.access_token}` },
          body: JSON.stringify({ action: 'groups', token: instance.token }) }
      );
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();

      let groupsData: any[] = [];
      if (Array.isArray(data)) groupsData = data;
      else if (data.groups && Array.isArray(data.groups)) groupsData = data.groups;
      else if (data.data && Array.isArray(data.data)) groupsData = data.data;

      setGroups(groupsData.map((g: any) => ({
        id: g.JID || g.jid || g.id,
        name: g.Name || g.name || g.subject || 'Sem nome',
        jid: g.JID || g.jid || g.id,
        size: g.Size || g.size || g.Participants?.length || g.participants?.length || 0,
        participants: (g.Participants || g.participants || []).map((p: any) => ({
          jid: p.JID || p.jid || p.id, pushName: p.DisplayName || p.PushName || p.pushName || p.displayName || '',
          phoneNumber: p.PhoneNumber || p.phoneNumber || '',
          isAdmin: p.IsAdmin || p.isAdmin || false, isSuperAdmin: p.IsSuperAdmin || p.isSuperAdmin || false,
        })),
      })));
    } catch (error) { console.error('Error fetching groups:', error); toast.error('Erro ao buscar grupos'); }
    finally { setLoadingGroups(false); }
  };

  const handleGroupToggle = (groupId: string) => {
    const s = new Set(selectedGroupIds);
    s.has(groupId) ? s.delete(groupId) : s.add(groupId);
    setSelectedGroupIds(s);
  };

  const handleExtractFromGroups = () => {
    if (selectedGroupIds.size === 0) { toast.error('Selecione pelo menos um grupo'); return; }
    setIsExtracting(true);
    const leads: Lead[] = [];
    const seen = new Set<string>();
    selectedGroupIds.forEach(gid => {
      const group = groups.find(g => g.id === gid);
      if (!group) return;
      group.participants.forEach(p => {
        if (p.isAdmin || p.isSuperAdmin) return;
        const match = p.jid?.match(/^(\d+)@/);
        if (!match) return;
        const phone = match[1];
        if (seen.has(phone)) return;
        seen.add(phone);
        leads.push({ id: crypto.randomUUID(), phone: formatPhoneDisplay(phone), name: p.pushName || undefined, jid: p.jid, source: 'group', groupName: group.name });
      });
    });
    setIsExtracting(false);
    if (leads.length > 0) { onLeadsImported(leads); setSelectedGroupIds(new Set()); toast.success(`${leads.length} contato${leads.length !== 1 ? 's' : ''} extraído${leads.length !== 1 ? 's' : ''} dos grupos`); }
    else toast.error('Nenhum membro encontrado nos grupos selecionados');
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));

  return {
    activeTab, setActiveTab,
    // Paste
    pasteText, setPasteText, isParsing, handlePasteImport,
    // CSV
    csvFile, csvInputRef, isProcessingCsv, isDragging, parsedData,
    phoneColumnIndex, setPhoneColumnIndex, nameColumnIndex, setNameColumnIndex,
    showColumnMapping, handleFileUpload, handleDragOver, handleDragLeave, handleDrop,
    handleConfirmMapping, resetFileState,
    // Manual
    manualPhone, setManualPhone, manualName, setManualName, handleManualAdd,
    // Groups
    groups, loadingGroups, selectedGroupIds, groupSearch, setGroupSearch,
    isExtracting, filteredGroups, fetchGroups, handleGroupToggle, handleExtractFromGroups,
  };
}
