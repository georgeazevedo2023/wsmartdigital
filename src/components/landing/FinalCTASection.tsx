import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

const guarantees = [
  { icon: Clock, text: '7 dias grátis' },
  { icon: CreditCard, text: 'Sem cartão de crédito' },
  { icon: Shield, text: 'Cancele quando quiser' },
];

const FinalCTASection = () => {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <section ref={ref} className="relative z-10 py-24 border-t border-border/50 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative">
        <div className={cn("max-w-3xl mx-auto text-center transition-all duration-700", isInView ? "animate-fade-in" : "opacity-0 translate-y-10")}>
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>🔥 Período de testes com acesso ilimitado</span>
          </div>
          
          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Comece a automatizar suas mensagens{' '}
            <span className="text-gradient">agora</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Junte-se a mais de 500 empresas que já economizam tempo e vendem mais 
            com o WsmartQR.
          </p>
          
          {/* CTA Button */}
          <Link to="/login">
            <Button size="lg" className="glow-primary text-lg px-10 py-7 mb-8">
              Criar Conta Grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          
          {/* Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            {guarantees.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-primary" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          
          {/* Trust Elements */}
          <div className="mt-10 pt-10 border-t border-border/30 flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-5 h-5 text-primary" />
              <span>Conexão segura SSL</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Garantia de 7 dias</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span>Suporte via WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
