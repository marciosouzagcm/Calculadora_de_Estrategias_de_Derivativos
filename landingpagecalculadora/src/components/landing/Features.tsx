import { 
  Calculator, 
  Shield, 
  BarChart3, 
  FileText, 
  Clock, 
  Target,
  Layers,
  TrendingUp,
  LucideIcon
} from "lucide-react";
// AJUSTE: Caminho relativo para garantir funcionamento no Render/Vercel
import { Card, CardContent } from "../ui/card";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const features: FeatureItem[] = [
  {
    icon: Calculator,
    title: "Motor Black-Scholes",
    description: "Implementação proprietária do modelo BSM adaptado para o mercado brasileiro com Base 252 dias úteis.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Vigilante V2",
    description: "Sistema exclusivo de auditoria de risco que protege contra operações com risco de ruína e margem insuficiente.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: BarChart3,
    title: "5 Gregas Completas",
    description: "Delta, Gamma, Theta, Vega e Rho calculados em tempo real com precisão decimal para cada perna.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: Target,
    title: "Scanner Automático",
    description: "Busca inteligente de oportunidades com filtros configuráveis de Volatilidade Implícita e Moneyness.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Layers,
    title: "23 Estratégias",
    description: "De travas verticais a estruturas complexas como Diagonais, Calendários e Box Spreads.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: FileText,
    title: "Relatórios PDF",
    description: "Exportação profissional com gráficos de payoff e análise de risco para assessores e clientes.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Clock,
    title: "Base 252 Nativa",
    description: "Cálculos precisos considerando o calendário oficial de feriados da B3 e a contagem de dias úteis.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    icon: TrendingUp,
    title: "ROI Líquido Real",
    description: "Cálculo de retorno que desconta automaticamente emolumentos e taxas de liquidação da B3.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

export const Features = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Luz de fundo sutil para profundidade visual */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 blur-[120px] rounded-full -z-10" />

      <div className="container mx-auto px-4">
        
        {/* Section Header - Ajustado para garantir visibilidade do gradiente */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="text-foreground">Tecnologia</span>{" "}
            <span className="bg-gradient-to-r from-[#0A84FF] to-[#32D74B] bg-clip-text text-transparent inline-block">
              Institucional
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Ferramentas quantitativas de nível profissional, desenhadas especificamente para as particularidades do mercado brasileiro.
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group bg-card/50 backdrop-blur-sm border-border hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
            >
              <CardContent className="p-8">
                {/* Icon Container com animação no hover */}
                <div className={`inline-flex p-3 rounded-2xl ${feature.bgColor} mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <feature.icon className={`h-7 w-7 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground text-sm leading-relaxed antialiased">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};