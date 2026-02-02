/**
 * COMPONENTE: Pricing
 * DESCRIÇÃO: Tabela de preços atualizada com o novo arsenal de 23 estratégias.
 * AJUSTE: Corrigidos imports para caminhos relativos para compatibilidade com Vercel.
 */

import { Check, Sparkles } from "lucide-react";
// AJUSTES: Substituição de aliases @ por caminhos relativos
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

interface PricingPlan {
  name: string;
  description: string;
  price: string;
  priceOld?: string;
  period: string;
  features: string[];
  cta: string;
  popular: boolean;
  variant: "outline" | "default";
}

const plans: PricingPlan[] = [
  {
    name: "Free",
    description: "Para começar a explorar",
    price: "0",
    period: "para sempre",
    features: [
      "3 análises por mês",
      "Estratégias básicas (4)",
      "Gráfico de Payoff",
      "Cálculo de Gregas",
    ],
    cta: "Começar Grátis",
    popular: false,
    variant: "outline",
  },
  {
    name: "Starter",
    description: "Para traders iniciantes",
    price: "49",
    priceOld: "79",
    period: "/mês",
    features: [
      "10 análises por mês",
      "Scan semanal",
      "12 estratégias principais",
      "Suporte por email",
    ],
    cta: "Assinar Starter",
    popular: false,
    variant: "outline",
  },
  {
    name: "Trader",
    description: "Recursos completos",
    price: "149",
    priceOld: "199",
    period: "/mês",
    features: [
      "50 análises por mês",
      "Scan diário",
      "Todas as 23 estratégias",
      "Vigilante V2 Full",
      "Export PDF Profissional",
      "Suporte prioritário",
    ],
    cta: "Assinar Trader",
    popular: true,
    variant: "default",
  },
  {
    name: "Pro",
    description: "Para profissionais",
    price: "299",
    priceOld: "399",
    period: "/mês",
    features: [
      "Análises ilimitadas",
      "Alertas personalizados",
      "Carteira de opções",
      "API de Dados Básica",
      "White-label PDF",
      "Suporte dedicado",
    ],
    cta: "Assinar Pro",
    popular: false,
    variant: "outline",
  },
];

export const Pricing = () => {
  const APP_URL = "https://app.tradingprobrasil.com";

  const handleSubscriptionRedirect = (planName: string) => {
    window.location.href = `${APP_URL}/auth/register?plan=${planName.toLowerCase()}`;
  };

  return (
    <section id="precos" className="py-24 bg-background relative">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/30 text-primary font-bold">
            Preços Transparentes
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Planos para{" "}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              Todos os Níveis
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Tenha acesso ao motor quantitativo mais potente do Brasil. 
            Escolha o plano ideal para sua curva de aprendizado.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative flex flex-col bg-card border transition-all duration-500 transform hover:-translate-y-2 ${
                plan.popular 
                  ? "border-primary shadow-2xl shadow-primary/20 ring-1 ring-primary/50" 
                  : "border-border hover:border-primary/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-primary border-0 shadow-lg px-3 py-1 animate-bounce-subtle">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Mais Escolhido
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="min-h-[40px] text-xs">{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="flex-grow flex flex-col text-center">
                <div className="mb-8">
                  <div className="h-6">
                    {plan.priceOld && (
                      <span className="text-sm text-muted-foreground line-through opacity-70">
                        R$ {plan.priceOld}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm font-semibold text-muted-foreground">R$</span>
                    <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {plan.period}
                  </span>
                </div>
                
                <ul className="space-y-4 mb-8 text-left flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <div className={`mt-1 rounded-full p-0.5 ${plan.popular ? 'bg-primary/20' : 'bg-accent/20'}`}>
                        <Check className={`h-3.5 w-3.5 flex-shrink-0 ${plan.popular ? 'text-primary' : 'text-accent'}`} />
                      </div>
                      <span className="text-sm text-foreground/80 leading-tight font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handleSubscriptionRedirect(plan.name)}
                  variant={plan.variant}
                  className={`w-full h-12 rounded-xl text-md font-bold transition-all ${
                    plan.popular 
                      ? "bg-gradient-primary hover:scale-[1.02] border-0 shadow-lg shadow-primary/20" 
                      : "hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                  }`}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-16 p-8 border border-dashed border-border rounded-3xl bg-secondary/10">
          <p className="text-muted-foreground mb-4 text-sm">
            Operação em larga escala? Temos planos sob medida para{" "}
            <span className="text-primary font-bold">AAIs</span>,{" "}
            <span className="text-primary font-bold">Gestoras</span> e{" "}
            <span className="text-primary font-bold">Proprietary Trading Firms</span>.
          </p>
          <Button variant="link" className="text-primary font-bold hover:no-underline group h-auto p-0">
            Consultar Atendimento Prime 
            <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">→</span>
          </Button>
        </div>
      </div>
    </section>
  );
};