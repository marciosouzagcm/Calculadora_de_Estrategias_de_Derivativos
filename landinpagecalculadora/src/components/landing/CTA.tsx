/**
 * COMPONENTE: CTA (Call to Action)
 * DESCRIÇÃO: Seção de fechamento focada em conversão.
 * Atualizado para alinhar com a identidade TradingPro Brasil.
 */

import { ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTA = () => {
  // URL da calculadora para conversão imediata
  const APP_URL = "https://app.tradingprobrasil.com";

  /**
   * Redireciona para o fluxo de registro no subdomínio APP
   */
  const handleJoinNow = () => {
    window.location.href = `${APP_URL}/auth/register`;
  };

  return (
    <section className="py-24 bg-card relative overflow-hidden border-t border-border">
      {/* Efeitos de Background: Grid e Glow para foco central */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,132,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(10,132,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Badge de Rapidez */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-bounce-slow">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-accent uppercase tracking-wider">Acesso instantâneo à B3</span>
          </div>
          
          {/* Título de Impacto */}
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Pronto para operar com{" "}
            <span className="bg-gradient-to-r from-primary via-info to-accent bg-clip-text text-transparent">
              Inteligência Institucional?
            </span>
          </h2>
          
          {/* Prova Social/Autoridade */}
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Junte-se a traders que já utilizam a tecnologia <span className="text-foreground font-semibold">TradingPro Brasil</span> para auditar riscos e maximizar o retorno em opções.
          </p>
          
          {/* Botões de Ação Final */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleJoinNow}
              className="group bg-gradient-primary hover:opacity-90 text-lg px-10 py-7 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 font-bold"
            >
              Criar Minha Conta Grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => window.location.href = APP_URL}
              className="text-lg px-10 py-7 rounded-2xl border-border hover:bg-secondary transition-all font-semibold"
            >
              Ver Demonstração
            </Button>
          </div>
          
          {/* Quebra de Objeções: Micro-copy estratégico */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Plano Free vitalício</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-medium">Segurança Nível Bancário</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
