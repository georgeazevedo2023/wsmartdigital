import { useNavigate } from 'react-router-dom';
import BroadcastHistory from '@/components/broadcast/BroadcastHistory';

const BroadcastHistoryPage = () => {
  const navigate = useNavigate();

  const handleResend = (log: {
    instance_id: string;
    instance_name: string | null;
    message_type: string;
    content: string | null;
    media_url: string | null;
    carousel_data: unknown;
    groups_targeted: number;
  }) => {
    // Check if it's a lead broadcast (groups_targeted === 0)
    const isLeadBroadcast = log.groups_targeted === 0;
    
    // Store resend data in sessionStorage
    sessionStorage.setItem('resendData', JSON.stringify({
      messageType: log.message_type,
      content: log.content,
      mediaUrl: log.media_url,
      instanceId: log.instance_id,
      instanceName: log.instance_name,
      carouselData: log.carousel_data,
    }));
    
    // Navigate to appropriate broadcaster
    if (isLeadBroadcast) {
      navigate('/dashboard/leads-broadcast');
    } else {
      navigate('/dashboard/broadcast');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Histórico de Envios</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie o histórico de mensagens enviadas
        </p>
      </div>
      <BroadcastHistory onResend={handleResend} />
    </div>
  );
};

export default BroadcastHistoryPage;
