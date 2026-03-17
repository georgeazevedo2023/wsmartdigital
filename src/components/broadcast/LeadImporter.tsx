import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardPaste, FileSpreadsheet, Users, Plus } from 'lucide-react';
import { useLeadImport } from '@/hooks/useLeadImport';
import ImportPasteTab from './ImportPasteTab';
import ImportCsvTab from './ImportCsvTab';
import ImportGroupsTab from './ImportGroupsTab';
import ImportManualTab from './ImportManualTab';
import type { Instance } from './InstanceSelector';
import type { Lead } from '@/hooks/useLeadsBroadcaster';

interface LeadImporterProps {
  instance: Instance;
  onLeadsImported: (leads: Lead[]) => void;
}

const LeadImporter = ({ instance, onLeadsImported }: LeadImporterProps) => {
  const h = useLeadImport({ instance, onLeadsImported });

  return (
    <Tabs value={h.activeTab} onValueChange={(v) => h.setActiveTab(v as any)}>
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
        <TabsTrigger value="groups" className="gap-2" onClick={() => h.groups.length === 0 && h.fetchGroups()}>
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">De Grupos</span>
          <span className="sm:hidden">Grupos</span>
        </TabsTrigger>
        <TabsTrigger value="manual" className="gap-2">
          <Plus className="w-4 h-4" /> Manual
        </TabsTrigger>
      </TabsList>

      <TabsContent value="paste">
        <ImportPasteTab
          pasteText={h.pasteText}
          setPasteText={h.setPasteText}
          isParsing={h.isParsing}
          onImport={h.handlePasteImport}
        />
      </TabsContent>

      <TabsContent value="csv">
        <ImportCsvTab
          csvFile={h.csvFile}
          csvInputRef={h.csvInputRef}
          isProcessingCsv={h.isProcessingCsv}
          isDragging={h.isDragging}
          parsedData={h.parsedData}
          phoneColumnIndex={h.phoneColumnIndex}
          setPhoneColumnIndex={h.setPhoneColumnIndex}
          nameColumnIndex={h.nameColumnIndex}
          setNameColumnIndex={h.setNameColumnIndex}
          showColumnMapping={h.showColumnMapping}
          onFileUpload={h.handleFileUpload}
          onDragOver={h.handleDragOver}
          onDragLeave={h.handleDragLeave}
          onDrop={h.handleDrop}
          onConfirmMapping={h.handleConfirmMapping}
          onReset={h.resetFileState}
        />
      </TabsContent>

      <TabsContent value="groups">
        <ImportGroupsTab
          groups={h.groups}
          loadingGroups={h.loadingGroups}
          selectedGroupIds={h.selectedGroupIds}
          groupSearch={h.groupSearch}
          setGroupSearch={h.setGroupSearch}
          filteredGroups={h.filteredGroups}
          isExtracting={h.isExtracting}
          onFetchGroups={h.fetchGroups}
          onToggleGroup={h.handleGroupToggle}
          onExtract={h.handleExtractFromGroups}
        />
      </TabsContent>

      <TabsContent value="manual">
        <ImportManualTab
          manualPhone={h.manualPhone}
          setManualPhone={h.setManualPhone}
          manualName={h.manualName}
          setManualName={h.setManualName}
          onAdd={h.handleManualAdd}
        />
      </TabsContent>
    </Tabs>
  );
};

export default LeadImporter;
