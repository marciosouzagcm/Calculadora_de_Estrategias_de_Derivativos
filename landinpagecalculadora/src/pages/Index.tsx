/**
 * COMPONENTE: Index
 * DESCRIÇÃO: Página principal (Landing Page) do ecossistema Trading Board Pro.
 * AJUSTE: Incluído import de CSS e garantida a compatibilidade de estilos.
 */

import { useEffect } from "react";
// IMPORTANTE: Este import carrega o Tailwind e as variáveis de cor para a página
import "../index.css"; 

// CAMINHOS RELATIVOS:
import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { Features } from "../components/landing/Features";
import { Vigilante } from "../components/landing/Vigilante";
import { Strategies } from "../components/landing/Strategies";
import { Pricing } from "../components/landing/Pricing";
import { CTA } from "../components/landing/CTA";
import { Footer } from "../components/landing/Footer";

const Index = () => {
  
  // SEO e Scroll Suave
  useEffect(() => {
    document.title = "Trading Board Pro | Scanner de Estratégias de Derivativos";
    
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a'); // Melhora a detecção se o clique for em um ícone dentro do link
      
      if (anchor && anchor.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = anchor.getAttribute('href')?.substring(1);
        const element = document.getElementById(id || '');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('click', handleAnchorClick);
    return () => window.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    // As classes bg-background e text-foreground só funcionam se o index.css estiver importado!
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />

      <main role="main">
        {/* Seção Hero: Link para app.tradingprobrasil.com deve estar no componente Hero */}
        <Hero />

        <section id="recursos" aria-label="Recursos da Plataforma">
          <Features />
        </section>

        <Vigilante />

        <section id="estrategias" aria-label="Estratégias Suportadas">
          <Strategies />
        </section>

        <section id="precos" aria-label="Planos e Preços">
          <Pricing />
        </section>

        <CTA />
      </main>

      <Footer />
    </div>
  );
};

export default Index;