import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Instance } from '@/components/broadcast/InstanceSelector';

export interface Lead {
  id: string;
  phone: string;
  name?: string;
  jid: string;
  source: 'manual' | 'paste' | 'group';
  groupName?: string;
  isVerified?: boolean;
  verifiedName?: string;
  verificationStatus?: 'pending' | 'valid' | 'invalid' | 'error';
}

export interface LeadDatabase {
  id: string;
  name: string;
  description: string | null;
  leads_count: number;
  created_at: string;
  updated_at: string;
  instance_id?: string | null;
}

export interface ResendData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  instanceId: string;
  instanceName: string | null;
  carouselData?: {
    message?: string;
    cards?: Array<{
      id?: string;
      text?: string;
      image?: string;
      buttons?: Array<{
        id?: string;
        type: 'URL' | 'REPLY' | 'CALL';
        label: string;
        value?: string;
      }>;
    }>;
  };
}

type Step = 'instance' | 'contacts' | 'message';

export function useLeadsBroadcaster() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('instance');
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [selectedDatabases, setSelectedDatabases] = useState<LeadDatabase[]>([]);
  const [databases, setDatabases] = useState<LeadDatabase[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [isCreatingNewDatabase, setIsCreatingNewDatabase] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [isSavingDatabase, setIsSavingDatabase] = useState(false);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [editTarget, setEditTarget] = useState<LeadDatabase | null>(null);
  const [manageTarget, setManageTarget] = useState<LeadDatabase | null>(null);
  const [resendData, setResendData] = useState<ResendData | null>(null);

  // Check for resend data from history
  useEffect(() => {
    const storedData = sessionStorage.getItem('resendData');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setResendData(parsed);
        sessionStorage.removeItem('resendData');
        toast.info('Selecione a instância, base e contatos para reenviar a mensagem', { duration: 4000 });
      } catch (e) {
        console.error('Failed to parse resend data:', e);
        sessionStorage.removeItem('resendData');
      }
    }
  }, []);

  // Fetch databases when instance is selected
  useEffect(() => {
    if (selectedInstance && step === 'contacts') {
      fetchDatabases();
    }
  }, [selectedInstance, step]);

  const fetchDatabases = async () => {
    setIsLoadingDatabases(true);
    try {
      const { data, error } = await supabase
        .from('lead_databases')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setDatabases(data || []);
    } catch (error) {
      console.error('Error fetching databases:', error);
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  const loadLeadsFromDatabases = async (dbs: LeadDatabase[]) => {
    if (dbs.length === 0) {
      setLeads([]);
      setSelectedLeads(new Set());
      return;
    }
    setIsLoadingLeads(true);
    try {
      const ids = dbs.map(d => d.id);
      const { data, error } = await supabase
        .from('lead_database_entries')
        .select('*')
        .in('database_id', ids);
      if (error) throw error;

      const seen = new Set<string>();
      const uniqueEntries = (data || []).filter(entry => {
        if (seen.has(entry.phone)) return false;
        seen.add(entry.phone);
        return true;
      });

      const loadedLeads: Lead[] = uniqueEntries.map((entry) => ({
        id: entry.id,
        phone: entry.phone,
        name: entry.name || undefined,
        jid: entry.jid,
        source: (entry.source as Lead['source']) || 'paste',
        groupName: entry.group_name || undefined,
        isVerified: entry.is_verified || false,
        verifiedName: entry.verified_name || undefined,
        verificationStatus: entry.verification_status as Lead['verificationStatus'] || undefined,
      }));

      setLeads(loadedLeads);
      setSelectedLeads(new Set(loadedLeads.map(l => l.id)));
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Erro ao carregar contatos da base');
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleInstanceSelect = (instance: Instance) => {
    setSelectedInstance(instance);
    setStep('contacts');
  };

  const handleToggleDatabase = async (db: LeadDatabase) => {
    const isSelected = selectedDatabases.some(d => d.id === db.id);
    const newSelection = isSelected
      ? selectedDatabases.filter(d => d.id !== db.id)
      : [...selectedDatabases, db];
    setSelectedDatabases(newSelection);
    setIsCreatingNewDatabase(false);
    await loadLeadsFromDatabases(newSelection);
  };

  const handleSaveDatabase = async () => {
    if (!newDatabaseName.trim()) { toast.error('Digite um nome para a base'); return; }
    if (leads.length === 0) { toast.error('Importe pelo menos um contato'); return; }
    if (!user) { toast.error('Usuário não autenticado'); return; }

    setIsSavingDatabase(true);
    try {
      const { data: db, error: dbError } = await supabase
        .from('lead_databases')
        .insert({ name: newDatabaseName.trim(), user_id: user.id, leads_count: leads.length })
        .select()
        .single();
      if (dbError) throw dbError;

      const entries = leads.map((l) => ({
        database_id: db.id, phone: l.phone, name: l.name || null, jid: l.jid,
        source: l.source, group_name: l.groupName || null,
        is_verified: l.isVerified || false, verified_name: l.verifiedName || null,
        verification_status: l.verificationStatus || null,
      }));

      const { error: entriesError } = await supabase.from('lead_database_entries').insert(entries);
      if (entriesError) throw entriesError;

      const newDb: LeadDatabase = {
        id: db.id, name: db.name, description: db.description,
        leads_count: db.leads_count ?? 0, created_at: db.created_at ?? '', updated_at: db.updated_at ?? '',
      };
      setSelectedDatabases([newDb]);
      setDatabases(prev => [newDb, ...prev]);
      setIsCreatingNewDatabase(false);
      toast.success(`Base "${db.name}" salva com ${leads.length} contatos`);
    } catch (error) {
      console.error('Error saving database:', error);
      toast.error('Erro ao salvar base de leads');
    } finally {
      setIsSavingDatabase(false);
    }
  };

  const handleUpdateDatabase = async () => {
    if (selectedDatabases.length !== 1 || !user) return;
    const targetDb = selectedDatabases[0];
    setIsSavingDatabase(true);
    try {
      await supabase.from('lead_database_entries').delete().eq('database_id', targetDb.id);

      const entries = leads.map((l) => ({
        database_id: targetDb.id, phone: l.phone, name: l.name || null, jid: l.jid,
        source: l.source, group_name: l.groupName || null,
        is_verified: l.isVerified || false, verified_name: l.verifiedName || null,
        verification_status: l.verificationStatus || null,
      }));

      if (entries.length > 0) {
        const { error: entriesError } = await supabase.from('lead_database_entries').insert(entries);
        if (entriesError) throw entriesError;
      }

      const { error: updateError } = await supabase
        .from('lead_databases').update({ leads_count: leads.length }).eq('id', targetDb.id);
      if (updateError) throw updateError;

      setSelectedDatabases(prev => prev.map(d => d.id === targetDb.id ? { ...d, leads_count: leads.length } : d));
      setDatabases(prev => prev.map(d => d.id === targetDb.id ? { ...d, leads_count: leads.length } : d));
      toast.success('Base atualizada');
    } catch (error) {
      console.error('Error updating database:', error);
      toast.error('Erro ao atualizar base');
    } finally {
      setIsSavingDatabase(false);
    }
  };

  const handleLeadsImported = (importedLeads: Lead[]) => {
    const existingPhones = new Set(leads.map(l => l.phone));
    const newLeads = importedLeads.filter(l => !existingPhones.has(l.phone));
    const allLeads = [...leads, ...newLeads];
    setLeads(allLeads);
    setSelectedLeads(new Set([...selectedLeads, ...newLeads.map(l => l.id)]));
  };

  const handleVerifyNumbers = async () => {
    if (!selectedInstance || leads.length === 0) return;
    setIsVerifying(true);
    setVerificationProgress(0);
    try {
      const phones = leads.map(l => l.jid.replace('@s.whatsapp.net', ''));
      const BATCH_SIZE = 50;
      const results = new Map<string, { isValid: boolean; verifiedName?: string }>();

      for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const batch = phones.slice(i, i + BATCH_SIZE);
        const response = await supabase.functions.invoke('uazapi-proxy', {
          body: { action: 'check-numbers', token: selectedInstance.token, phones: batch },
        });
        if (response.error) { toast.error('Erro ao verificar números'); break; }

        if (response.data?.users && Array.isArray(response.data.users)) {
          response.data.users.forEach((u: any) => {
            const query = u.Query || u.query || '';
            results.set(query, {
              isValid: u.IsInWhatsapp || u.isInWhatsapp || false,
              verifiedName: u.VerifiedName || u.verifiedName || '',
            });
          });
        }
        setVerificationProgress(Math.min(100, ((i + batch.length) / phones.length) * 100));
      }

      setLeads(prev => prev.map(lead => {
        const phone = lead.jid.replace('@s.whatsapp.net', '');
        const result = results.get(phone);
        return {
          ...lead,
          verificationStatus: result ? (result.isValid ? 'valid' : 'invalid') : 'error',
          isVerified: result?.isValid ?? false,
          verifiedName: result?.verifiedName,
        };
      }));

      const validCount = Array.from(results.values()).filter(r => r.isValid).length;
      const invalidCount = Array.from(results.values()).filter(r => !r.isValid).length;
      toast.success(`Verificação concluída: ${validCount} válidos, ${invalidCount} inválidos`);
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Erro ao verificar números');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveInvalid = () => {
    const validLeads = leads.filter(l => l.verificationStatus !== 'invalid');
    const removedCount = leads.length - validLeads.length;
    setLeads(validLeads);
    const validIds = new Set(validLeads.map(l => l.id));
    setSelectedLeads(new Set([...selectedLeads].filter(id => validIds.has(id))));
    toast.success(`${removedCount} contato${removedCount !== 1 ? 's' : ''} inválido${removedCount !== 1 ? 's' : ''} removido${removedCount !== 1 ? 's' : ''}`);
  };

  const handleSelectOnlyValid = () => {
    const validIds = new Set(leads.filter(l => l.verificationStatus === 'valid').map(l => l.id));
    setSelectedLeads(validIds);
    toast.success(`${validIds.size} contatos válidos selecionados`);
  };

  const handleComplete = () => {
    setLeads([]); setSelectedLeads(new Set()); setStep('instance');
    setSelectedInstance(null); setSelectedDatabases([]); setIsCreatingNewDatabase(false);
    setNewDatabaseName(''); setResendData(null);
  };

  const handleBack = () => {
    if (step === 'message') {
      setStep('contacts');
    } else if (step === 'contacts') {
      setStep('instance'); setSelectedInstance(null); setSelectedDatabases([]);
      setLeads([]); setSelectedLeads(new Set()); setIsCreatingNewDatabase(false);
    }
  };

  const handleChangeInstance = () => {
    setStep('instance'); setSelectedInstance(null); setSelectedDatabases([]);
    setLeads([]); setSelectedLeads(new Set()); setIsCreatingNewDatabase(false);
  };

  const handleClearLeads = () => { setLeads([]); setSelectedLeads(new Set()); };

  const handleDatabaseUpdated = (updated: LeadDatabase) => {
    setDatabases(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDatabases(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  const handleStartNewDatabase = () => {
    setIsCreatingNewDatabase(true); setSelectedDatabases([]); setLeads([]);
    setSelectedLeads(new Set()); setNewDatabaseName('');
  };

  const hasVerifiedLeads = leads.some(l => l.verificationStatus);
  const validLeadsCount = leads.filter(l => l.verificationStatus === 'valid').length;
  const invalidLeadsCount = leads.filter(l => l.verificationStatus === 'invalid').length;
  const selectedLeadsList = leads.filter(l => selectedLeads.has(l.id));
  const hasUnsavedChanges = isCreatingNewDatabase && leads.length > 0 && selectedDatabases.length === 0;
  const canSaveDatabase = isCreatingNewDatabase && leads.length > 0 && !!newDatabaseName.trim();

  return {
    step, setStep, selectedInstance, selectedDatabases, databases,
    isLoadingDatabases, isCreatingNewDatabase, newDatabaseName, setNewDatabaseName,
    leads, selectedLeads, setSelectedLeads, isVerifying, verificationProgress,
    isSavingDatabase, isLoadingLeads, editTarget, setEditTarget,
    manageTarget, setManageTarget, resendData, setResendData,
    hasVerifiedLeads, validLeadsCount, invalidLeadsCount, selectedLeadsList,
    hasUnsavedChanges, canSaveDatabase,
    handleInstanceSelect, handleToggleDatabase, handleSaveDatabase,
    handleUpdateDatabase, handleLeadsImported, handleVerifyNumbers,
    handleRemoveInvalid, handleSelectOnlyValid, handleComplete,
    handleBack, handleChangeInstance, handleClearLeads, handleDatabaseUpdated,
    handleStartNewDatabase, handleContinueToMessage: () => setStep('message'),
  };
}
