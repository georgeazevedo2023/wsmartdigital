import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ShiftReportSection from '@/components/settings/ShiftReportSection';
import SystemInfoSection from '@/components/settings/SystemInfoSection';

const Settings = () => {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Configurações do sistema WsmartQR</p>
      </div>

      <ShiftReportSection />
      <SystemInfoSection />
    </div>
  );
};

export default Settings;
