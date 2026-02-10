import { Tag, MessageSquareReply, Bell, Rocket, CreditCard, Check } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

const useCases = [
  {
    icon: Tag,
    title: 'Ofertas Relâmpago',
    description: 'Dispare promos segmentadas para sua base',
    message: '🔥 Olá! Temos uma oferta EXCLUSIVA para você: *30% OFF* em todos os produtos até sexta! Aproveite agora 👇\n\n🛒 Comprar Agora: link.wsmart/oferta',
    time: '09:32',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: MessageSquareReply,
    title: 'Follow-up Automático',
    description: 'Reengaje leads que não responderam',
    message: 'Oi, tudo bem? 😊 Vi que você se interessou pelo nosso plano Pro. Posso te ajudar com alguma dúvida? Estou à disposição!',
    time: '14:15',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Bell,
    title: 'Lembretes Inteligentes',
    description: 'Reduza faltas e atrasos com alertas',
    message: '📅 Lembrete: Sua consulta está agendada para *amanhã, 10h*.\n\nEndereço: Rua das Flores, 123\nConfirme respondendo ✅',
    time: '18:00',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Rocket,
    title: 'Lançamentos e Novidades',
    description: 'Gere expectativa e urgência',
    message: '🚀 LANÇAMENTO! O novo *Smart Hub Pro* chegou!\n\n✨ Mais rápido\n✨ Mais potente\n✨ Preço especial de lançamento\n\nGaranta o seu! Vagas limitadas 🔒',
    time: '10:00',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: CreditCard,
    title: 'Cobrança e Avisos',
    description: 'Recupere pagamentos de forma não invasiva',
    message: 'Olá! 😊 Identificamos que seu boleto no valor de *R$ 197,00* vence amanhã.\n\n💳 Pix: chave@empresa.com\n📄 Boleto: link.wsmart/boleto\n\nQualquer dúvida, estamos aqui!',
    time: '08:45',
    color: 'from-emerald-500 to-green-500',
  },
];

const UseCasesSection = () => {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section ref={ref} className="relative z-10 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
            Casos de Uso
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Veja como <span className="text-gradient">empresas reais</span> usam o WsmartQR
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Do follow-up à cobrança, cada mensagem é uma oportunidade de venda
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <div
                key={useCase.title}
                className={`glass-card-hover rounded-2xl p-6 transition-all duration-700 ${
                  isInView
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: isInView ? `${index * 100}ms` : '0ms' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{useCase.title}</h3>
                    <p className="text-xs text-muted-foreground">{useCase.description}</p>
                  </div>
                </div>

                {/* WhatsApp message mockup */}
                <div className="bg-[#0B141A] rounded-xl p-3 mt-4">
                  <div className="bg-[#005C4B] rounded-xl p-3">
                    <p className="text-white text-sm whitespace-pre-line leading-relaxed">
                      {useCase.message}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-2 text-white/50 text-xs">
                      <span>{useCase.time}</span>
                      <Check className="w-3 h-3" />
                      <Check className="w-3 h-3 -ml-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UseCasesSection;
