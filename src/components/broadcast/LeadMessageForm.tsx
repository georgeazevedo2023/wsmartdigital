import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Image, LayoutGrid } from 'lucide-react';
import BroadcastTextTab from './BroadcastTextTab';
import BroadcastMediaTab from './BroadcastMediaTab';
import { CarouselEditor } from './CarouselEditor';
import { CarouselPreview } from './CarouselPreview';
import MessagePreview from './MessagePreview';
import { TemplateSelector } from './TemplateSelector';
import LeadSendControls from './LeadSendControls';
import { useLeadMessageForm } from '@/hooks/useLeadMessageForm';
import type { ActiveTab } from '@/hooks/useBroadcastForm';
import type { Instance } from './InstanceSelector';
import type { Lead } from '@/pages/dashboard/LeadsBroadcaster';

interface InitialData {
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
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

interface LeadMessageFormProps {
  instance: Instance;
  selectedLeads: Lead[];
  onComplete?: () => void;
  initialData?: InitialData;
}

const LeadMessageForm = ({ instance, selectedLeads, onComplete, initialData }: LeadMessageFormProps) => {
  const form = useLeadMessageForm({ instance, selectedLeads, onComplete, initialData });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Message Form */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Compor Mensagem
            </CardTitle>
            <TemplateSelector
              onSelect={form.handleSelectTemplate}
              onSave={form.handleSaveTemplate}
              disabled={form.isSending}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={form.activeTab} onValueChange={(v) => form.setActiveTab(v as ActiveTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text" className="gap-2">
                <MessageSquare className="w-4 h-4" /> Texto
              </TabsTrigger>
              <TabsTrigger value="media" className="gap-2">
                <Image className="w-4 h-4" /> Mídia
              </TabsTrigger>
              <TabsTrigger value="carousel" className="gap-2">
                <LayoutGrid className="w-4 h-4" /> Carrossel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <BroadcastTextTab
                message={form.message}
                onMessageChange={form.setMessage}
                disabled={form.isSending}
              />
            </TabsContent>

            <TabsContent value="media" className="mt-4">
              <BroadcastMediaTab
                mediaType={form.mediaType}
                onMediaTypeChange={form.setMediaType}
                mediaUrl={form.mediaUrl}
                onMediaUrlChange={form.setMediaUrl}
                selectedFile={form.selectedFile}
                previewUrl={form.previewUrl}
                caption={form.caption}
                onCaptionChange={form.setCaption}
                isPtt={form.isPtt}
                onIsPttChange={form.setIsPtt}
                filename={form.filename}
                onFilenameChange={form.setFilename}
                fileInputRef={form.fileInputRef}
                onFileSelect={form.handleFileSelect}
                onClearFile={form.clearFile}
                getAcceptedTypes={form.getAcceptedTypes}
                disabled={form.isSending}
              />
            </TabsContent>

            <TabsContent value="carousel" className="mt-4">
              <CarouselEditor
                value={form.carouselData}
                onChange={form.setCarouselData}
                disabled={form.isSending}
              />
            </TabsContent>
          </Tabs>

          <LeadSendControls
            randomDelay={form.randomDelay}
            onRandomDelayChange={form.setRandomDelay}
            estimatedTime={form.estimatedTime}
            canSend={form.canSend}
            isSending={form.isSending}
            isComplete={form.isComplete}
            progress={form.progress}
            elapsedTime={form.elapsedTime}
            successCount={form.successCount}
            failCount={form.failCount}
            leadsCount={selectedLeads.length}
            onSend={form.handleSend}
            onPause={form.handlePause}
            onResume={form.handleResume}
            onCancel={form.handleCancel}
            onReset={form.handleReset}
            onComplete={onComplete}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {form.activeTab === 'carousel' ? (
            <CarouselPreview message={form.carouselData.message} cards={form.carouselData.cards} />
          ) : (
            <MessagePreview
              type={form.activeTab === 'text' ? 'text' : form.mediaType}
              text={form.activeTab === 'text' ? form.message : form.caption}
              previewUrl={form.previewUrl}
              mediaUrl={form.activeTab === 'media' ? form.mediaUrl : undefined}
              filename={form.filename}
              isPtt={form.isPtt}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadMessageForm;
