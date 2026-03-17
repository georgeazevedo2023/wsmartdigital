import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Image, LayoutGrid } from 'lucide-react';
import { ScheduleMessageDialog } from '@/components/group/ScheduleMessageDialog';
import { TemplateSelector } from './TemplateSelector';
import MessagePreview from './MessagePreview';
import { CarouselEditor } from './CarouselEditor';
import BroadcastProgressModal from './BroadcastProgressModal';
import BroadcastTextTab from './BroadcastTextTab';
import BroadcastMediaTab from './BroadcastMediaTab';
import BroadcastCommonControls from './BroadcastCommonControls';
import { useBroadcastForm } from '@/hooks/useBroadcastForm';
import type { InitialData } from '@/hooks/useBroadcastForm';
import type { ActiveTab } from '@/hooks/useBroadcastForm';
import type { Instance } from './InstanceSelector';
import type { Group } from './GroupSelector';

interface BroadcastMessageFormProps {
  instance: Instance;
  selectedGroups: Group[];
  onComplete?: () => void;
  initialData?: InitialData;
}

const BroadcastMessageForm = ({ instance, selectedGroups, onComplete, initialData }: BroadcastMessageFormProps) => {
  const form = useBroadcastForm({ instance, selectedGroups, onComplete, initialData });

  return (
    <>
      <BroadcastProgressModal
        progress={form.progress}
        activeTab={form.activeTab}
        excludeAdmins={form.excludeAdmins}
        elapsedTime={form.elapsedTime}
        remainingTime={form.remainingTime}
        onPause={form.handlePause}
        onResume={form.handleResume}
        onCancel={form.handleCancel}
        onClose={form.handleCloseProgress}
      />

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
        <CardContent>
          <Tabs value={form.activeTab} onValueChange={(v) => form.setActiveTab(v as ActiveTab)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />Texto
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <Image className="w-4 h-4" />Mídia
              </TabsTrigger>
              <TabsTrigger value="carousel" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />Carrossel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text">
              <BroadcastTextTab
                message={form.message}
                onMessageChange={form.setMessage}
                disabled={form.isSending}
              />
            </TabsContent>

            <TabsContent value="media">
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
                fileInputRef={form.fileInputRef as React.RefObject<HTMLInputElement>}
                onFileSelect={form.handleFileSelect}
                onClearFile={form.clearFile}
                getAcceptedTypes={form.getAcceptedTypes}
                disabled={form.isSending}
              />
            </TabsContent>

            <TabsContent value="carousel" className="space-y-4">
              <CarouselEditor
                value={form.carouselData}
                onChange={form.setCarouselData}
                disabled={form.isSending}
              />
            </TabsContent>

            {/* Message Preview - only for text and media tabs */}
            {form.activeTab !== 'carousel' && (
              <MessagePreview
                type={form.activeTab === 'text' ? 'text' : form.mediaType}
                text={form.activeTab === 'text' ? form.message : form.caption}
                mediaUrl={form.activeTab === 'media' ? form.mediaUrl : undefined}
                previewUrl={form.activeTab === 'media' ? form.previewUrl : undefined}
                filename={form.filename}
                isPtt={form.isPtt}
                onTextChange={(newText) => {
                  if (form.activeTab === 'text') form.setMessage(newText);
                  else form.setCaption(newText);
                }}
                disabled={form.isSending}
              />
            )}

            <BroadcastCommonControls
              activeTab={form.activeTab}
              mediaType={form.mediaType}
              isPtt={form.isPtt}
              excludeAdmins={form.excludeAdmins}
              onExcludeAdminsChange={form.setExcludeAdmins}
              randomDelay={form.randomDelay}
              onRandomDelayChange={form.setRandomDelay}
              selectedGroups={selectedGroups}
              selectedParticipants={form.selectedParticipants}
              onParticipantSelectionChange={form.handleParticipantSelectionChange}
              uniqueRegularMembersCount={form.uniqueRegularMembersCount}
              totalRegularMembers={form.totalRegularMembers}
              totalMembers={form.totalMembers}
              targetCount={form.targetCount}
              estimatedTime={form.estimatedTime}
              carouselCardCount={form.carouselData.cards.length}
              isSending={form.isSending}
              canSend={form.canSend}
              canSchedule={form.canSchedule}
              onSend={form.handleSend}
              onScheduleOpen={() => form.setShowScheduleDialog(true)}
            />
          </Tabs>
        </CardContent>
      </Card>

      <ScheduleMessageDialog
        open={form.showScheduleDialog}
        onOpenChange={form.setShowScheduleDialog}
        onConfirm={form.handleSchedule}
        isLoading={form.isScheduling}
      />
    </>
  );
};

export default BroadcastMessageForm;
