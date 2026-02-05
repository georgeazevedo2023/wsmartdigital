 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { 
   MessageSquare, Shield, Server, Users, ArrowRight, Zap,
   Send, Calendar, LayoutGrid, Database, History, Image, Video, Mic
 } from 'lucide-react';
 
 const features = [
   {
     icon: Server,
     title: 'Múltiplas Instâncias',
     description: 'Conecte e gerencie várias instâncias do WhatsApp em um painel centralizado.',
   },
   {
     icon: Send,
     title: 'Disparador em Massa',
     description: 'Envie mensagens para múltiplos grupos ou leads com delays anti-bloqueio.',
   },
   {
     icon: LayoutGrid,
     title: 'Carrosséis Interativos',
     description: 'Crie mensagens com cards interativos contendo imagens, textos e botões.',
   },
   {
     icon: Database,
     title: 'Gestão de Leads',
     description: 'Importe e organize contatos em bases separadas para campanhas direcionadas.',
   },
   {
     icon: Calendar,
     title: 'Agendamento de Envios',
     description: 'Programe mensagens para datas específicas com opções de recorrência.',
   },
   {
     icon: History,
     title: 'Histórico Completo',
     description: 'Rastreie todos os envios com estatísticas de sucesso e opção de reenvio.',
   },
 ];
 
 const messageTypes = [
   { icon: MessageSquare, label: 'Texto' },
   { icon: Image, label: 'Imagens' },
   { icon: Video, label: 'Vídeos' },
   { icon: Mic, label: 'Áudios' },
   { icon: LayoutGrid, label: 'Carrosséis' },
 ];
 
 const steps = [
   { step: '01', title: 'Conecte', description: 'Escaneie o QR Code para conectar sua instância do WhatsApp' },
   { step: '02', title: 'Selecione', description: 'Escolha grupos ou importe leads para sua campanha' },
   { step: '03', title: 'Dispare', description: 'Envie mensagens instantaneamente ou agende para depois' },
 ];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/3 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl">WsmartQR</span>
          </div>
          <Link to="/login">
            <Button variant="outline">
              Entrar
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 py-24 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
              <Zap className="w-4 h-4" />
              <span>Plataforma Multi-Tenant de WhatsApp</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">
              Gerencie múltiplas instâncias do
              <span className="text-gradient"> WhatsApp</span> em um só lugar
            </h1>
            
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
               WsmartQR é uma plataforma SaaS completa para gestão e automação de WhatsApp. 
               Dispare mensagens para grupos e leads, agende envios e crie carrosséis interativos.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login">
                <Button size="lg" className="glow-primary">
                  Começar Agora
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline">
                Saiba Mais
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar suas instâncias do WhatsApp de forma profissional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

       {/* Message Types Section */}
       <section className="relative z-10 py-24 border-t border-border/50">
         <div className="container mx-auto px-4">
           <div className="text-center mb-16 animate-fade-in">
             <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
               Múltiplos Formatos de Mensagem
             </h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">
               Envie diferentes tipos de conteúdo para engajar sua audiência
             </p>
           </div>
 
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto animate-fade-in">
             {messageTypes.map((item, i) => (
               <div 
                 key={i} 
                 className="flex flex-col items-center p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all"
               >
                 <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                   <item.icon className="w-7 h-7 text-primary" />
                 </div>
                 <span className="text-sm font-medium">{item.label}</span>
               </div>
             ))}
           </div>
         </div>
       </section>
 
       {/* How it Works Section */}
       <section className="relative z-10 py-24 border-t border-border/50">
         <div className="container mx-auto px-4">
           <div className="text-center mb-16 animate-fade-in">
             <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
               Simples e Eficiente
             </h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">
               Em poucos passos você está pronto para disparar suas mensagens
             </p>
           </div>
 
           <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto animate-fade-in">
             {steps.map((item, i) => (
               <div key={i} className="text-center">
                 <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                   <span className="text-xl font-display font-bold text-primary">{item.step}</span>
                 </div>
                 <h3 className="font-display font-semibold text-lg mb-2">{item.title}</h3>
                 <p className="text-muted-foreground text-sm">{item.description}</p>
               </div>
             ))}
           </div>
         </div>
       </section>
 
      {/* CTA Section */}
      <section className="relative z-10 py-24 border-t border-border/50">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground mb-8">
              Crie sua conta e comece a gerenciar suas instâncias do WhatsApp hoje mesmo.
            </p>
            <Link to="/login">
              <Button size="lg" className="glow-primary">
                Criar Conta Grátis
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-border/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
           <p>© 2026 WsmartQR. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
