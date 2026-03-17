import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callUazapiProxy } from '@/lib/uazapiProxy';
import { toast } from 'sonner';
import { normalizeQrSrc, extractQrCode, checkIfConnected } from '@/lib/qrCodeUtils';

interface UseQrPollingOptions {
  onConnected: () => void;
}

export const useQrPolling = ({ onConnected }: UseQrPollingOptions) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stopPolling, [stopPolling]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!qrDialogOpen) stopPolling();
  }, [qrDialogOpen, stopPolling]);

  const startPolling = useCallback((token: string) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const data = await callUazapiProxy({ action: 'status', token });
        if (checkIfConnected(data)) {
          stopPolling();
          toast.success('Conectado com sucesso!');
          setQrDialogOpen(false);
          setQrCode(null);
          onConnected();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);
  }, [stopPolling, onConnected]);

  const connect = useCallback(async (instanceName: string, token: string) => {
    setQrDialogOpen(true);
    setIsLoadingQr(true);
    setQrCode(null);

    try {
      const result = await callUazapiProxy({ action: 'connect', instanceName, token });

      if (checkIfConnected(result)) {
        toast.success('Instância já está conectada!');
        setQrDialogOpen(false);
        onConnected();
        return { connected: true, qr: null };
      }

      const qr = extractQrCode(result);
      if (qr) {
        setQrCode(normalizeQrSrc(qr));
        startPolling(token);
        return { connected: false, qr };
      } else {
        toast.error('Não foi possível gerar o QR Code');
        return { connected: false, qr: null };
      }
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast.error(error.message || 'Erro ao gerar QR Code');
      return { connected: false, qr: null };
    } finally {
      setIsLoadingQr(false);
    }
  }, [startPolling, onConnected]);

  const closeDialog = useCallback(() => {
    stopPolling();
    setQrDialogOpen(false);
    setQrCode(null);
  }, [stopPolling]);

  return {
    qrDialogOpen,
    qrCode,
    isLoadingQr,
    connect,
    closeDialog,
    /** Expose for cases where QR is set externally (e.g. after create) */
    setQrCode,
    setQrDialogOpen,
    startPolling,
  };
};
