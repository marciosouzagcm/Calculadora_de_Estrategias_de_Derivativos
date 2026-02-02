/**
 * COMPONENTE: Index
 * DESCRIÇÃO: Página principal (Landing Page) do ecossistema Trading Board Pro.
 * AJUSTE: Removidos aliases @ para garantir compatibilidade no deploy Vercel.
 */

import { useEffect } from "react";
// CAMINHOS RELATIVOS CORRIGIDOS:
import { Header } from "../components/landing/Header";
import { Hero } from "../components/landing/Hero";
import { Features } from "../components/landing/Features";
import { Vigilante } from "../components/landing/Vigilante";
import { Strategies } from "../components/landing/Strategies";
import { Pricing } from "../components/landing/Pricing";
import { CTA } from "../components/landing/CTA";
import { Footer } from "../components/landing/Footer";

const Index = () => {
  
  // Efeito para otimização de SEO e scroll suave ao carregar a página
  useEffect(() => {
    document.title = "Trading Board Pro | Scanner de Estratégias de Derivativos";
    // Garante que links internos com âncoras (#) funcionem suavemente
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const id = target.getAttribute('href')?.substring(1);
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Cabeçalho de Navegação: Contém Logo e Links Âncora */}
      <Header />

      <main role="main">
        {/* Seção Hero: Impacto inicial e CTA Principal para o Subdomínio APP */}
        <Hero />

        {/* Seção de Recursos: Detalhamento técnico das funcionalidades */}
        <section id="recursos" aria-label="Recursos da Plataforma">
          <Features />
        </section>

        {/* Seção Vigilante: Diferencial competitivo de monitoramento de risco */}
        <Vigilante />

        {/* Seção de Estratégias: Exemplos de operações Black-Scholes */}
        <section id="estrategias" aria-label="Estratégias Suportadas">
          <Strategies />
        </section>

        {/* Seção de Preços: Planos de Assinatura e Monetização */}
        <section id="precos" aria-label="Planos e Preços">
          <Pricing />
        </section>

        {/* Call to Action Final: Último incentivo antes do rodapé */}
        <CTA />
      </main>

      {/* Rodapé: Informações Legais, Links e Redes Sociais */}
      <Footer />
    </div>
  );
};

export default Index;