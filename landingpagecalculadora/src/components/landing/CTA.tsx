/**
 * COMPONENTE: CTA (Call to Action)
 * DESCRIÇÃO: Seção de conversão final com blindagem de renderização.
 */

import { ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";

export const CTA = () => {
  const APP_URL = "https://app.tradingprobrasil.com";

  const handleJoinNow = () => {
    window.location.href = `${APP_URL}/auth/register`;
  };

  return (
    <section className="py-24 bg-card relative overflow-hidden border-t border-border">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,132,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(10,132,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-60" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-accent uppercase tracking-wider">
              Acesso instantâneo à B3
            </span>
          </div>
          
          {/* TÍTULO BLINDADO: leading-normal e inline-block para não cortar o gradiente */}
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 tracking-tight text-foreground leading-tight">
            <span className="block sm:inline">Pronto para operar com</span>{" "}
            <span className="bg-gradient-to-r from-[#0A84FF] via-[#32D74B] to-[#FFD60A] bg-clip-text text-transparent leading-normal inline-block">
              Inteligência Institucional?
            </span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Junte-se a centenas de traders que utilizam a tecnologia da <span className="text-foreground font-semibold">TradingPro Brasil</span> para auditar riscos e maximizar retornos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleJoinNow}
              className="group bg-gradient-primary hover:opacity-90 text-lg px-10 py-7 rounded-2xl shadow-2xl shadow-primary/25 transition-all hover:scale-105 font-bold w-full sm:w-auto"
            >
              Criar Minha Conta Grátis
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => window.location.href = APP_URL}
              className="text-lg px-10 py-7 rounded-2xl border-border hover:bg-secondary transition-all font-semibold w-full sm:w-auto"
            >
              Ver Demonstração
            </Button>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-muted-foreground">
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
              <span className="font-medium">Cálculos Auditados</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};