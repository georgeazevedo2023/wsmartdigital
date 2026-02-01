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
  }) => {
    // Store resend data in sessionStorage and navigate to broadcaster
    sessionStorage.setItem('resendData', JSON.stringify({
      messageType: log.message_type,
      content: log.content,
      mediaUrl: log.media_url,
      instanceId: log.instance_id,
      instanceName: log.instance_name,
    }));
    navigate('/dashboard/broadcast');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Histórico de Envios</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie o histórico de mensagens enviadas
        </p>
      </div>
      <BroadcastHistory onResend={handleResend} />
    </div>
  );
};

export default BroadcastHistoryPage;
