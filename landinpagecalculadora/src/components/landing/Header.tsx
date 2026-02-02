/**
 * COMPONENTE: Header
 * DESCRIÇÃO: Barra de navegação fixa com suporte a scroll suave e links para a aplicação.
 * AJUSTE: Corrigido import do Button para caminho relativo para compatibilidade com Vercel.
 */

import { Button } from "../ui/button"; // Ajustado: de @/components/ui/button para ../ui/button
import { Menu, X } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // URL da aplicação para os botões de conversão
  const APP_URL = "https://app.tradingprobrasil.com";

  /**
   * Links de navegação interna (Âncoras)
   */
  const navLinks = [
    { label: "Recursos", href: "#recursos" },
    { label: "Estratégias", href: "#estrategias" },
    { label: "Preços", href: "#precos" },
    { label: "Documentação", href: "#docs" },
  ];

  /**
   * Redireciona o usuário para a calculadora
   */
  const handleAppRedirect = () => {
    window.location.href = APP_URL;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          
          {/* LOGO: Identidade visual oficial TradingPro Brasil */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
          >
            <img 
              src="/Logo.png" 
              alt="TradingPro Brasil" 
              className="h-10 md:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Versão do Sistema ao lado da Logo */}
            <span className="hidden lg:inline-block text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20 uppercase">
              V2026.1
            </span>
          </div>
          
          {/* NAVEGAÇÃO DESKTOP */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          {/* AÇÕES DESKTOP: Login e Cadastro */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleAppRedirect}
              className="hover:text-primary transition-colors font-semibold"
            >
              Entrar
            </Button>
            <Button 
              size="sm" 
              onClick={handleAppRedirect}
              className="bg-gradient-primary hover:opacity-90 border-0 shadow-md shadow-primary/10 font-bold px-6"
            >
              Começar Grátis
            </Button>
          </div>
          
          {/* BOTÃO MENU MOBILE */}
          <button 
            className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
        
        {/* MENU MOBILE: Exibição condicional */}
        {isMenuOpen && (
          <div className="md:hidden py-6 border-t border-border bg-background/95 animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-5">
              {navLinks.map((link) => (
                <a 
                  key={link.href}
                  href={link.href} 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-base font-medium text-muted-foreground hover:text-primary px-2"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-6 border-t border-border">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={handleAppRedirect}
                  className="w-full justify-center font-bold"
                >
                  Entrar
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleAppRedirect}
                  className="w-full bg-gradient-primary border-0 font-bold"
                >
                  Começar Grátis
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};