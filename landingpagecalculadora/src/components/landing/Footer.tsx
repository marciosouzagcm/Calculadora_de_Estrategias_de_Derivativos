/**
 * COMPONENTE: Footer
 * DESCRIÇÃO: Rodapé institucional completo com aviso de risco e links estratégicos.
 * STATUS: Revisão final da Landing Page TradingPro Brasil.
 */

import { Github, Linkedin, Twitter, ExternalLink, ShieldAlert } from "lucide-react";

export const Footer = () => {
  // Configurações centralizadas para facilitar futuras trocas de URL
  const APP_URL = "https://app.tradingprobrasil.com";
  const GITHUB_REPO = "https://github.com/marciosouzagcm/Calculadora_de_Estrategias_de_Derivativos";
  const YEAR = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border py-16 relative overflow-hidden">
      {/* Detalhe visual: Borda superior com gradiente sutil */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* COLUNA 1: Brand & Social */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-white">TP</span>
              </div>
              <span className="text-xl font-bold tracking-tight">
                TradingPro<span className="text-primary">Brasil</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Tecnologia quantitativa de ponta para o mercado brasileiro. 
              Transformando dados complexos da B3 em decisões estratégicas simplificadas para traders de opções.
            </p>
            <div className="flex gap-5">
              <a href="#" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" aria-label="LinkedIn" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* COLUNA 2: Produto */}
          <div>
            <h4 className="font-bold text-foreground mb-6 uppercase text-[10px] tracking-widest">Produto</h4>
            <ul className="space-y-3">
              <li>
                <a href={`${APP_URL}/scanner`} className="text-sm text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 font-medium">
                  Scanner de Opções <ExternalLink className="h-3 w-3 opacity-50" />
                </a>
              </li>
              <li>
                <a href="#estrategias" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Estratégias</a>
              </li>
              <li>
                <a href={`${APP_URL}/vigilante`} className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Vigilante V2</a>
              </li>
              <li>
                <a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Planos & Preços</a>
              </li>
            </ul>
          </div>
          
          {/* COLUNA 3: Suporte & Recursos */}
          <div>
            <h4 className="font-bold text-foreground mb-6 uppercase text-[10px] tracking-widest">Recursos</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Documentação API</a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Central de Ajuda</a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Blog do Trader</a>
              </li>
              <li>
                <a href="mailto:suporte@tradingprobrasil.com" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Suporte Técnico</a>
              </li>
            </ul>
          </div>
          
          {/* COLUNA 4: Legal */}
          <div>
            <h4 className="font-bold text-foreground mb-6 uppercase text-[10px] tracking-widest">Legal</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Termos de Uso</a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Política de Privacidade</a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all font-medium">Cookies</a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-all underline decoration-primary/30 font-medium italic">Compliance CVM</a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* RODAPÉ FINAL: Copyright e Aviso de Risco */}
        <div className="pt-8 border-t border-border/50">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
            <div className="text-left shrink-0">
              <p className="text-sm text-muted-foreground">
                © {YEAR} <span className="font-semibold text-foreground">TradingPro Brasil</span>. 
                <br className="md:hidden" /> Todos os direitos reservados.
              </p>
            </div>
            
            {/* Disclaimer Jurídico Profissional */}
            <div className="max-w-2xl bg-secondary/30 p-4 rounded-xl border border-border/50">
              <div className="flex gap-2 mb-2 items-center text-warning">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Aviso de Risco Importante</span>
              </div>
              <p className="text-[10px] leading-relaxed text-muted-foreground uppercase tracking-tight">
                O mercado de derivativos e opções envolve riscos substanciais de perda de capital e não é adequado para todos os investidores. 
                O TradingPro Brasil é uma plataforma de tecnologia e auxílio matemático, não constituindo recomendação de compra ou venda 
                de ativos. Decisões de investimento são de responsabilidade exclusiva do usuário. 
                Performance passada não garante resultados futuros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};