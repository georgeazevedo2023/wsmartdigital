import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Server, Shield, Database } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Settings = () => {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Configurações do sistema WsmartQR</p>
      </div>

      {/* System Info */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Informações do Sistema
          </CardTitle>
          <CardDescription>
            Detalhes sobre a configuração atual do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Versão</span>
            <Badge variant="outline">v1.0.0</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">API UAZAPI</span>
            <Badge className="bg-success/10 text-success border-success/20">
              Conectada
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ambiente</span>
            <Badge variant="secondary">Produção</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Configurações de segurança do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">RLS (Row Level Security)</span>
            <Badge className="bg-success/10 text-success border-success/20">
              Ativo
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Autenticação</span>
            <Badge className="bg-success/10 text-success border-success/20">
              Email + Senha
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Banco de Dados
          </CardTitle>
          <CardDescription>
            Informações sobre o armazenamento de dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Provider</span>
            <Badge variant="outline">Lovable Cloud</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className="bg-success/10 text-success border-success/20">
              Online
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
