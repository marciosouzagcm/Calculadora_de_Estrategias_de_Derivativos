/**
 * COMPONENTE: Hero
 * DESCRIÇÃO: Seção principal de impacto da Landing Page.
 * AJUSTE: Corrigido import do Button para caminho relativo para compatibilidade com Vercel.
 */

import { ArrowRight, Shield, TrendingUp, Zap } from "lucide-react";
// AJUSTE: Caminho relativo para evitar erro de alias @ no build da Vercel
import { Button } from "../ui/button";

export const Hero = () => {
  
  // URL da calculadora configurada anteriormente
  const APP_URL = "https://app.tradingprobrasil.com";

  /**
   * Função para navegação externa
   * @param url - Destino para onde o usuário será enviado
   */
  const handleStartNow = (url: string) => {
    window.location.href = url;
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Background Grid: Malha visual de fundo para aspecto tecnológico */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,132,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(10,132,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Floating Orbs: Elementos visuais abstratos com animação de pulso */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          
          {/* Badge: Versão e Status do sistema */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-primary">V2026.1 Production Ready</span>
          </div>
          
          {/* Title: H1 otimizado para SEO */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-foreground">Inteligência</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-info to-accent bg-clip-text text-transparent">
              Institucional em Opções
            </span>
          </h1>
          
          {/* Subtitle: Foco na Base 252 e mercado brasileiro */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            A plataforma quantitativa definitiva para o mercado brasileiro (B3).
            Motor Black-Scholes de alta precisão com <span className="text-primary font-semibold">Base 252 dias úteis</span>.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              size="lg" 
              onClick={() => handleStartNow(APP_URL)}
              className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 font-bold"
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => handleStartNow(APP_URL)}
              className="text-lg px-8 py-6 rounded-xl border-border hover:bg-secondary font-semibold"
            >
              Ver Demonstração
            </Button>
          </div>
          
          {/* Feature Pills: Reforço visual - ATUALIZADO PARA 23 ESTRATÉGIAS */}
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-sm">
              <Shield className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">Vigilante Anti-Ruína</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-sm">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">23 Estratégias Quant</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border shadow-sm">
              <Zap className="h-5 w-5 text-warning" />
              <span className="text-sm font-medium">Gregas em Tempo Real</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Gradient: Transição suave para a próxima seção */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};